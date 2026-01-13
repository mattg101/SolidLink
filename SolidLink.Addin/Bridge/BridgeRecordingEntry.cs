using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SolidLink.Addin.Bridge
{
    public class BridgeRecordingEntry
    {
        [JsonProperty("timestampUtc")]
        public DateTimeOffset TimestampUtc { get; set; }

        [JsonProperty("direction")]
        public string Direction { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("correlationId")]
        public string CorrelationId { get; set; }

        [JsonProperty("payload")]
        public JToken Payload { get; set; }
    }
}
