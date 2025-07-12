import { atom } from "jotai";

/**
 * プレイリスト作成モーダルの開閉状態
 */
export const playlistCreateModalAtom = atom<boolean>(false);

/**
 * レイアウト作成モーダルの開閉状態
 */
export const layoutCreateModalAtom = atom<boolean>(false);

/**
 * レイアウト編集モーダルの状態
 */
export const layoutEditModalAtom = atom<{ opened: boolean; layoutId: string | null }>({
  opened: false,
  layoutId: null,
});

/**
 * コンテンツプレビューモーダルの状態
 */
export const contentPreviewModalAtom = atom<{ opened: boolean; contentId: string | null }>({
  opened: false,
  contentId: null,
});

/**
 * モーダル操作のアクション
 */
export const modalActionsAtom = atom(
  null,
  (
    _get,
    set,
    action:
      | { type: "OPEN_PLAYLIST_CREATE" }
      | { type: "CLOSE_PLAYLIST_CREATE" }
      | { type: "OPEN_LAYOUT_CREATE" }
      | { type: "CLOSE_LAYOUT_CREATE" }
      | { type: "OPEN_LAYOUT_EDIT"; layoutId: string }
      | { type: "CLOSE_LAYOUT_EDIT" }
      | { type: "OPEN_CONTENT_PREVIEW"; contentId: string }
      | { type: "CLOSE_CONTENT_PREVIEW" },
  ) => {
    switch (action.type) {
      case "OPEN_PLAYLIST_CREATE":
        set(playlistCreateModalAtom, true);
        break;
      case "CLOSE_PLAYLIST_CREATE":
        set(playlistCreateModalAtom, false);
        break;
      case "OPEN_LAYOUT_CREATE":
        set(layoutCreateModalAtom, true);
        break;
      case "CLOSE_LAYOUT_CREATE":
        set(layoutCreateModalAtom, false);
        break;
      case "OPEN_LAYOUT_EDIT":
        set(layoutEditModalAtom, { opened: true, layoutId: action.layoutId });
        break;
      case "CLOSE_LAYOUT_EDIT":
        set(layoutEditModalAtom, { opened: false, layoutId: null });
        break;
      case "OPEN_CONTENT_PREVIEW":
        set(contentPreviewModalAtom, { opened: true, contentId: action.contentId });
        break;
      case "CLOSE_CONTENT_PREVIEW":
        set(contentPreviewModalAtom, { opened: false, contentId: null });
        break;
    }
  },
);
