const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const getLegacyUserMedia = () => {
  if (typeof navigator === "undefined") return undefined;
  return (
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia ||
    (navigator as any).msGetUserMedia
  );
};

const buildMediaDevices = (): MediaDevices | null => {
  if (typeof navigator === "undefined") return null;
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices;
  }

  const legacyGetUserMedia = getLegacyUserMedia();
  if (!legacyGetUserMedia) return null;

  const polyfilled = navigator.mediaDevices ?? ({} as MediaDevices);
  polyfilled.getUserMedia = (constraints: MediaStreamConstraints) =>
    new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(navigator, constraints, resolve, reject);
    });

  return polyfilled;
};

const isInsecureNetworkContext = () => {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return false;
  const hostname = window.location.hostname.toLowerCase();
  return !LOCAL_HOSTS.has(hostname);
};

export async function requestCameraStream(constraints?: MediaStreamConstraints) {
  if (typeof navigator === "undefined") {
    throw new Error("Camera access is not available in this environment.");
  }

  const devices = buildMediaDevices();
  if (!devices?.getUserMedia) {
    if (isInsecureNetworkContext()) {
      throw new Error(
        "Camera access requires HTTPS when accessing the app over a network. Please use https:// or a secure tunnel."
      );
    }
    throw new Error("Camera access is not supported in this browser.");
  }

  const baseVideo: MediaTrackConstraints = {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const incomingVideo = constraints?.video;
  const mergedVideo =
    incomingVideo === false
      ? false
      : { ...baseVideo, ...(typeof incomingVideo === "object" ? incomingVideo : {}) };

  const mergedAudio =
    typeof constraints?.audio === "undefined"
      ? false
      : constraints.audio;

  const mergedConstraints: MediaStreamConstraints = {
    audio: mergedAudio,
    video: mergedVideo,
  };

  try {
    return await devices.getUserMedia(mergedConstraints);
  } catch (err) {
    if (isInsecureNetworkContext() && err instanceof DOMException && err.name === "NotAllowedError") {
      throw new Error(
        "Camera access requires HTTPS when accessing the app over a network. Please use https:// or a secure tunnel."
      );
    }
    throw err;
  }
}
