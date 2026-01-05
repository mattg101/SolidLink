using Newtonsoft.Json;

namespace SolidLink.Addin.Model
{
    public class Joint
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; } // "fixed", "revolute", "prismatic", etc.

        [JsonProperty("axis")]
        public double[] Axis { get; set; } = { 1, 0, 0 };

        [JsonProperty("limits")]
        public JointLimits Limits { get; set; }

        public Joint() { }
    }

    public class JointLimits
    {
        [JsonProperty("lower")]
        public double Lower { get; set; }

        [JsonProperty("upper")]
        public double Upper { get; set; }

        [JsonProperty("velocity")]
        public double Velocity { get; set; }

        [JsonProperty("effort")]
        public double Effort { get; set; }
    }
}
