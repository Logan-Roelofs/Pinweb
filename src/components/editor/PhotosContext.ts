import { createContext, useContext } from "react";
import type { Photo } from "../../lib/types";

/** The game's uploaded photos, for photo rows inside the editor. */
export const PhotosContext = createContext<Photo[]>([]);

export const usePagePhotos = () => useContext(PhotosContext);
