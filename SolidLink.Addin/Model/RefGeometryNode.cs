using Newtonsoft.Json;

namespace SolidLink.Addin.Model
{
    public class RefGeometryNode
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("path")]
        public string Path { get; set; }

        [JsonProperty("parentPath")]
        public string ParentPath { get; set; }

        [JsonProperty("axisDirection")]
        public double[] AxisDirection { get; set; }

        [JsonProperty("localTransform")]
        public TransformModel LocalTransform { get; set; }

        public RefGeometryNode()
        {
            LocalTransform = new TransformModel();
        }
    }
}
