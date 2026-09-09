declare module "aplayer" {
  type APlayerAudio = {
    name: string;
    artist?: string;
    url: string;
    cover?: string;
    lrc?: string;
    theme?: string;
    type?: string;
  };

  type APlayerOptions = {
    container: HTMLElement;
    fixed?: boolean;
    mini?: boolean;
    autoplay?: boolean;
    theme?: string;
    loop?: "all" | "one" | "none";
    order?: "list" | "random";
    preload?: "none" | "metadata" | "auto";
    volume?: number;
    mutex?: boolean;
    lrcType?: number;
    listFolded?: boolean;
    listMaxHeight?: number | string;
    storageName?: string;
    audio: APlayerAudio | APlayerAudio[];
  };

  export default class APlayer {
    constructor(options: APlayerOptions);
    play(): void;
    pause(): void;
    toggle(): void;
    destroy(): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
    list?: {
      audios?: APlayerAudio[];
      index?: number;
    };
  }
}
