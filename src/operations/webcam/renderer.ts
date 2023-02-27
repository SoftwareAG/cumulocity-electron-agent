/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import "./index.css";

async function startWebRTC() {
  console.log("Instanciate RTCPeerConnection");
  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  });

  console.log("Instanciate get streams");
  try {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { min: 640, ideal: 1920, max: 1920 },
        height: { min: 360, ideal: 1080, max: 1080 },
      },
      audio: false,
    });

    console.log("localstream", localStream);

    localStream.getTracks().forEach((track) => {
      console.log(track);
      pc.addTrack(track, localStream);
    });
  } catch (e) {
    console.log("unable to get streams.", e);
    failed();
    return;
  }

  try {
    const offer = await getOffer(pc);
    console.log("offer:", offer);

    sendOfferToAgent(pc, offer);
  } catch (e) {
    console.log("unable to get offer", e);
    failed();
    return;
  }
}

function failed() {
  sendOfferToAgent(null, { candidates: [], offerDescription: null });
}

function sendOfferToAgent(
  pc: RTCPeerConnection,
  offer: {
    candidates: RTCIceCandidate[];
    offerDescription: RTCSessionDescriptionInit;
  }
) {
  if (pc) {
    (window as any).electronAPI.handleAnswer(
      (event: any, answerPayload: any) => {
        const { answer, candidates } = JSON.parse(answerPayload);
        pc.setRemoteDescription(answer);
        candidates.forEach((can: any) => {
          pc.addIceCandidate(can);
        });
      }
    );
  }
  (window as any).electronAPI.sendOffer(JSON.stringify(offer));
}

async function getOffer(pc: RTCPeerConnection): Promise<{
  candidates: Array<RTCIceCandidate>;
  offerDescription: RTCSessionDescriptionInit;
}> {
  const candidates = new Array<RTCIceCandidate>();
  // eslint-disable-next-line prefer-const
  let offerDescription: RTCSessionDescriptionInit;
  console.log("getOffer");
  const promise = new Promise<{
    candidates: Array<RTCIceCandidate>;
    offerDescription: RTCSessionDescriptionInit;
  }>((resolve) => {
    pc.onicegatheringstatechange = (event) => {
      if (pc.iceGatheringState === "complete") {
        console.log("Gathering completed: ", candidates);
        resolve({ candidates, offerDescription });
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate);
      }
    };
  });
  offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);
  return promise;
}

startWebRTC();
