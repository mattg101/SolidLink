using System.Collections.Generic;
using Newtonsoft.Json;

namespace SolidLink.Addin.Bridge
{
    public class BridgeRecording
    {
        [JsonProperty("messages")]
        public List<BridgeRecordingEntry> Messages { get; set; }

        public BridgeRecording()
        {
            Messages = new List<BridgeRecordingEntry>();
        }
    }
}
