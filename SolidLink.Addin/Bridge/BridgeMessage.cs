using Newtonsoft.Json;

namespace SolidLink.Addin.Bridge
{
    /// <summary>
    /// Represents a message exchanged between C# backend and JavaScript frontend via WebView2.
    /// </summary>
    public class BridgeMessage
    {
        /// <summary>
        /// Message type identifier (e.g., "PING", "PONG", "REQUEST_TREE").
        /// </summary>
        [JsonProperty("type")]
        public string Type { get; set; }

        /// <summary>
        /// Unique ID for request/response correlation.
        /// </summary>
        [JsonProperty("correlationId")]
        public string CorrelationId { get; set; }

        /// <summary>
        /// Message payload (varies by message type).
        /// </summary>
        [JsonProperty("payload")]
        public object Payload { get; set; }

        /// <summary>
        /// Error message if this message represents a failure. Null on success.
        /// </summary>
        [JsonProperty("error")]
        public string Error { get; set; }

        public BridgeMessage() { }

        public BridgeMessage(string type, object payload = null, string correlationId = null)
        {
            Type = type;
            Payload = payload;
            CorrelationId = correlationId ?? System.Guid.NewGuid().ToString();
        }
    }
}
