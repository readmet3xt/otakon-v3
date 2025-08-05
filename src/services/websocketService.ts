let ws: WebSocket | null = null;
let connectionErrorHandled = false;
const SERVER_ADDRESS = 'wss://otakon-relay.onrender.com';

const connect = (
  code: string,
  onOpen: () => void,
  onMessage: (data: any) => void,
  onError: (error: string) => void,
  onClose: () => void
) => {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log("WebSocket is already open or connecting.");
    return;
  }

  connectionErrorHandled = false; // Reset flag on new connection attempt

  if (!/^\d{4}$/.test(code)) {
    onError("Invalid code format. Please enter a 4-digit code.");
    return;
  }

  const fullUrl = `${SERVER_ADDRESS}/${code}`;

  try {
    ws = new WebSocket(fullUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unknown error occurred.";
    onError(`Connection failed: ${message}. Please check the URL and your network connection.`);
    return;
  }

  ws.onopen = () => {
    console.log("WebSocket connection established to:", fullUrl);
    onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      onMessage(data);
    } catch (e) {
      console.error("Failed to parse WebSocket message:", event.data, e);
      onMessage(event.data);
    }
  };

  ws.onerror = (event: Event) => {
    console.error("WebSocket error event:", event);
    if (!connectionErrorHandled) {
      // This is a generic error, onclose will have more details.
      // But we call onError here to ensure an error is always reported to the user.
      onError("WebSocket connection error. The server might be unreachable or refusing the connection.");
      connectionErrorHandled = true;
    }
  };

  ws.onclose = (event: CloseEvent) => {
    console.log(`WebSocket connection closed. Code: ${event.code}, Reason: '${event.reason}', Clean: ${event.wasClean}`);
    
    // If the close was not clean and we haven't already handled the error via onerror
    if (!event.wasClean && !connectionErrorHandled) {
        let errorMessage = "Connection closed unexpectedly.";
        if (event.code === 1006) { // Abnormal closure
            errorMessage = "Connection failed. Please ensure the desktop app is running and the 4-digit code is valid.";
        } else if (event.reason) {
            errorMessage = `Connection closed: ${event.reason} (Code: ${event.code})`;
        }
        onError(errorMessage);
    }

    ws = null;
    onClose();
  };
};

const disconnect = () => {
  if (ws) {
    // Use the 1000 code for a normal, intentional closure.
    ws.close(1000, "User disconnected");
    ws = null;
  }
};

export { connect, disconnect };