using System.Collections.Generic;
using Newtonsoft.Json;

namespace SolidLink.Addin.Model
{
    public class Link
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("inertial")]
        public InertialModel Inertial { get; set; }

        [JsonProperty("visuals")]
        public List<GeometryModel> Visuals { get; set; } = new List<GeometryModel>();

        [JsonProperty("collisions")]
        public List<GeometryModel> Collisions { get; set; } = new List<GeometryModel>();

        public Link() { }
    }

    public class InertialModel
    {
        [JsonProperty("mass")]
        public double Mass { get; set; }

        [JsonProperty("origin")]
        public double[] Origin { get; set; } = new double[3];

        [JsonProperty("inertia")]
        public double[] Inertia { get; set; } = new double[6]; // ixx, ixy, ixz, iyy, iyz, izz
    }

    public class GeometryModel
    {
        [JsonProperty("type")]
        public string Type { get; set; } // "mesh", "primitive"

        [JsonProperty("uri")]
        public string Uri { get; set; } // e.g. "package://meshes/link1.stl"

        [JsonProperty("color")]
        public double[] Color { get; set; } = { 0.8, 0.8, 0.8, 1.0 };
    }
}
