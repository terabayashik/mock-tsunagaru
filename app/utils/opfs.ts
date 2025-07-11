/**
 * OPFS (Origin Private File System) utility functions
 * ファイル分割方式: A案
 * - /playlists/index.json - プレイリスト一覧のメタデータ
 * - /playlists/playlist-{id}.json - 個別のプレイリスト詳細データ
 */

export class OPFSError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "OPFSError";
  }
}

export class OPFSManager {
  private static instance: OPFSManager;
  private root: FileSystemDirectoryHandle | null = null;

  static getInstance(): OPFSManager {
    if (!OPFSManager.instance) {
      OPFSManager.instance = new OPFSManager();
    }
    return OPFSManager.instance;
  }

  private async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (!this.root) {
      if (!("getDirectory" in navigator.storage)) {
        throw new OPFSError("OPFS is not supported in this browser");
      }
      try {
        this.root = await navigator.storage.getDirectory();
        console.log("[OPFS] Successfully initialized root directory");
      } catch (error) {
        console.error("[OPFS] Failed to get root directory:", error);
        throw new OPFSError("Failed to access OPFS root directory", error);
      }
    }
    return this.root;
  }

  async readJSON<T>(filePath: string): Promise<T | null> {
    try {
      console.log(`[OPFS] Reading JSON from: ${filePath}`);
      const root = await this.getRoot();

      // Handle nested paths
      const pathParts = filePath.split("/");
      let currentHandle: FileSystemDirectoryHandle = root;

      // Navigate to the directory containing the file
      for (let i = 0; i < pathParts.length - 1; i++) {
        try {
          currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
        } catch (error) {
          if (error instanceof DOMException && error.name === "NotFoundError") {
            console.log(`[OPFS] Directory not found: ${pathParts[i]}`);
            return null;
          }
          throw error;
        }
      }

      // Get the file
      const fileName = pathParts[pathParts.length - 1];
      const fileHandle = await currentHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text) as T;
      console.log(`[OPFS] Successfully read JSON from: ${filePath}`);
      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        console.log(`[OPFS] File not found: ${filePath}`);
        return null;
      }
      console.error(`[OPFS] Failed to read JSON from ${filePath}:`, error);
      throw new OPFSError(`Failed to read JSON from ${filePath}`, error);
    }
  }

  async writeJSON<T>(filePath: string, data: T): Promise<void> {
    try {
      console.log(`[OPFS] Writing JSON to: ${filePath}`);
      const root = await this.getRoot();

      // Handle nested paths
      const pathParts = filePath.split("/");
      let currentHandle: FileSystemDirectoryHandle = root;

      // Ensure all directories in the path exist
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        try {
          currentHandle = await currentHandle.getDirectoryHandle(dirName);
          console.log(`[OPFS] Directory exists: ${dirName}`);
        } catch (error) {
          if (error instanceof DOMException && error.name === "NotFoundError") {
            currentHandle = await currentHandle.getDirectoryHandle(dirName, { create: true });
            console.log(`[OPFS] Created directory: ${dirName}`);
          } else {
            throw error;
          }
        }
      }

      // Create/write the file
      const fileName = pathParts[pathParts.length - 1];
      const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();

      console.log(`[OPFS] Successfully wrote JSON to: ${filePath}`);
    } catch (error) {
      console.error(`[OPFS] Failed to write JSON to ${filePath}:`, error);
      throw new OPFSError(`Failed to write JSON to ${filePath}`, error);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      console.log(`[OPFS] Deleting file: ${filePath}`);
      const root = await this.getRoot();

      // Handle nested paths
      const pathParts = filePath.split("/");
      let currentHandle: FileSystemDirectoryHandle = root;

      // Navigate to the directory containing the file
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
      }

      // Delete the file
      const fileName = pathParts[pathParts.length - 1];
      await currentHandle.removeEntry(fileName);

      console.log(`[OPFS] Successfully deleted file: ${filePath}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        console.log(`[OPFS] File not found for deletion: ${filePath}`);
        return; // File doesn't exist, which is fine for deletion
      }
      console.error(`[OPFS] Failed to delete file ${filePath}:`, error);
      throw new OPFSError(`Failed to delete file ${filePath}`, error);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const root = await this.getRoot();

      // Handle nested paths
      const pathParts = filePath.split("/");
      let currentHandle: FileSystemDirectoryHandle = root;

      // Navigate to the directory containing the file
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
      }

      // Check if file exists
      const fileName = pathParts[pathParts.length - 1];
      await currentHandle.getFileHandle(fileName);
      return true;
    } catch {
      return false;
    }
  }
}
