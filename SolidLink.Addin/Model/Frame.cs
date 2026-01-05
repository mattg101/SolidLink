using System.Collections.Generic;
using Newtonsoft.Json;

namespace SolidLink.Addin.Model
{
    public class Frame
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("localTransform")]
        public TransformModel LocalTransform { get; set; }

        [JsonProperty("joint")]
        public Joint Joint { get; set; }

        [JsonProperty("links")]
        public List<Link> Links { get; set; } = new List<Link>();

        [JsonProperty("children")]
        public List<Frame> Children { get; set; } = new List<Frame>();

        public Frame()
        {
            Id = System.Guid.NewGuid().ToString();
            LocalTransform = new TransformModel();
        }
    }

    public class TransformModel
    {
        [JsonProperty("position")]
        public double[] Position { get; set; } = new double[3]; // [x, y, z]

        [JsonProperty("rotation")]
        public double[] Rotation { get; set; } = new double[4]; // [x, y, z, w] quaternion

        public TransformModel()
        {
            Rotation[3] = 1.0; // Identity quaternion
        }
    }
}
