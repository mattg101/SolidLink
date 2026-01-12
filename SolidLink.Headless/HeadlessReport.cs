using Newtonsoft.Json;
using SolidLink.Addin.Model;

namespace SolidLink.Headless
{
    public class HeadlessReport
    {
        [JsonProperty("model")]
        public RobotModel Model { get; set; }
    }
}
