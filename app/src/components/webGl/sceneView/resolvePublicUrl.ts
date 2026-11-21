/**
 * public/ からの相対パス（先頭に / を付けない）を、読み込みに使う URL にする。
 * GitHub Pages ではサブパスで公開するため、BASE_URL（末尾が /）を前に付ける
 */
export const resolvePublicUrl = (path: string): string => {
  // 絶対パス・スキーム付きの URL・.. を含むパスは想定外なので、開発時だけ警告する
  if (
    import.meta.env.DEV &&
    (path.startsWith("/") ||
      /^[a-z][a-z0-9+.-]*:/i.test(path) ||
      path.split("/").includes(".."))
  ) {
    console.warn(
      `resolvePublicUrl: public/ からの相対パスを渡してください: ${path}`
    );
  }
  return `${import.meta.env.BASE_URL}${path}`;
};
