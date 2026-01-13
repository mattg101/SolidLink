using System.Collections.Generic;
using Newtonsoft.Json;

namespace SolidLink.Headless.Mocks
{
    public class FixtureData
    {
        [JsonProperty("title")]
        public string Title { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("unitToMeters")]
        public double? UnitToMeters { get; set; }

        [JsonProperty("rootComponent")]
        public ComponentFixture RootComponent { get; set; }
    }

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

        [JsonProperty("referenceFrames")]
        public List<ReferenceFrameFixture> ReferenceFrames { get; set; } = new List<ReferenceFrameFixture>();
    }

    public class BodyFixture
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("tessellation")]
        public float[] Tessellation { get; set; }
    }

    public class ReferenceFrameFixture
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("transform")]
        public double[] Transform { get; set; }
    }
}
