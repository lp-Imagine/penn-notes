/**
 * Decap 媒体库改为上传到 COS。
 * 选图后 POST /api/decap-images，把返回的 CDN 地址写进封面或正文，不提交原文件。
 */
(function () {
  var ROOT_ID = "penn-cos-media";

  function githubToken() {
    var keys = ["decap-cms-user", "netlify-cms-user"];
    for (var i = 0; i < keys.length; i++) {
      try {
        var raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        var data = JSON.parse(raw);
        if (data && typeof data.token === "string" && data.token) return data.token;
      } catch (e) {
        /* ignore broken storage */
      }
    }
    return "";
  }

  function closePicker() {
    var el = document.getElementById(ROOT_ID);
    if (el) el.remove();
  }

  function openPicker(handleInsert) {
    closePicker();
    var root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "penn-cos-media";
    root.innerHTML =
      '<div class="penn-cos-media-card" role="dialog" aria-modal="true" aria-labelledby="penn-cos-media-title">' +
      '<h2 id="penn-cos-media-title">上传图片</h2>' +
      "<p>图片会存到 COS，文章里写入 CDN 地址，不会提交进 Git。</p>" +
      '<label class="penn-cos-media-file">选择图片<input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif"></label>' +
      '<p class="penn-cos-media-status" role="status"></p>' +
      '<div class="penn-cos-media-actions"><button type="button" data-cancel>取消</button></div>' +
      "</div>";
    document.body.appendChild(root);

    var status = root.querySelector(".penn-cos-media-status");
    var input = root.querySelector("input");
    var busy = false;

    function setStatus(text) {
      status.textContent = text || "";
    }

    root.querySelector("[data-cancel]").addEventListener("click", closePicker);
    root.addEventListener("click", function (event) {
      if (event.target === root && !busy) closePicker();
    });

    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file || busy) return;
      if (file.size > 8 * 1024 * 1024) {
        setStatus("图片不能超过 8MB");
        input.value = "";
        return;
      }
      var token = githubToken();
      if (!token) {
        setStatus("请先登录后再上传");
        input.value = "";
        return;
      }
      busy = true;
      input.disabled = true;
      setStatus("正在上传…");
      file
        .arrayBuffer()
        .then(function (buf) {
          return fetch("/api/decap-images", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": file.type || "application/octet-stream",
            },
            body: buf,
          });
        })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok || !result.data || !result.data.url) {
            throw new Error((result.data && result.data.message) || "上传失败");
          }
          handleInsert(result.data.url);
          closePicker();
        })
        .catch(function (err) {
          busy = false;
          input.disabled = false;
          input.value = "";
          setStatus(err && err.message ? err.message : "上传失败");
        });
    });
  }

  CMS.registerMediaLibrary({
    name: "penn-cos",
    init: function (args) {
      return {
        show: function () {
          openPicker(args.handleInsert);
        },
        hide: closePicker,
        enableStandalone: function () {
          return false;
        },
      };
    },
  });
})();
