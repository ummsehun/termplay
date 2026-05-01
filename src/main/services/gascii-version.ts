export type ReleaseVersion = {
  tag: string;
  parts: [number, number, number];
};

export const parseReleaseVersion = (tag: string): ReleaseVersion | null => {
  const match = /^v(\d+)\.(\d+)(?:\.(\d+))?$/.exec(tag);
  if (!match) {
    return null;
  }

  return {
    tag,
    parts: [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)],
  };
};

export const compareVersionParts = (left: [number, number, number], right: [number, number, number]): number => {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
};

export const compareTags = (left: string, right: string): number => {
  const leftVersion = parseReleaseVersion(left);
  const rightVersion = parseReleaseVersion(right);

  if (!leftVersion || !rightVersion) {
    return 0;
  }

  return compareVersionParts(leftVersion.parts, rightVersion.parts);
};

export const parseTagFromReleaseUrl = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    const match = /\/releases\/tag\/([^/]+)$/.exec(parsedUrl.pathname);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};
