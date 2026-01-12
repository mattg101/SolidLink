using System.Collections.Generic;
using Newtonsoft.Json;

namespace SolidLink.Tests.Mocks
{
    /// <summary>
    /// Root fixture data structure for JSON deserialization.
    /// </summary>
    public class FixtureData
    {
        [JsonProperty("title")]
        public string Title { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("rootComponent")]
        public ComponentFixture RootComponent { get; set; }
    }

    /// <summary>
    /// Component fixture data.
    /// </summary>
    public class ComponentFixture
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("transform")]
        public double[] Transform { get; set; }

        [JsonProperty("children")]
        public List<ComponentFixture> Children { get; set; } = new List<ComponentFixture>();

        [JsonProperty("bodies")]
        public List<BodyFixture> Bodies { get; set; } = new List<BodyFixture>();

        [JsonProperty("materialColor")]
        public double[] MaterialColor { get; set; }
    }

    /// <summary>
    /// Body fixture data.
    /// </summary>
    public class BodyFixture
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("tessellation")]
        public float[] Tessellation { get; set; }
    }
}
