using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SolidLink.Tests.Fixtures;

namespace SolidLink.Tests.Unit
{
    [TestFixture]
    public class SnapshotNormalizerTests
    {
        [Test]
        public void Normalize_OrdersPropertiesAndArrays()
        {
            var json = @"{
  ""type"": ""Assembly"",
  ""title"": ""OrderingFixture"",
  ""rootComponent"": {
    ""children"": [
      {
        ""name"": ""Z-Child"",
        ""transform"": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
        ""materialColor"": [0.1, 0.1, 0.1, 1.0],
        ""bodies"": [],
        ""children"": [],
        ""referenceFrames"": []
      },
      {
        ""name"": ""A-Child"",
        ""transform"": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
        ""materialColor"": [0.2, 0.2, 0.2, 1.0],
        ""bodies"": [],
        ""children"": [],
        ""referenceFrames"": []
      }
    ],
    ""referenceFrames"": [
      { ""name"": ""FrameB"", ""type"": ""CoordSys"", ""transform"": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] },
      { ""name"": ""FrameA"", ""type"": ""RefAxis"", ""transform"": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] }
    ],
    ""bodies"": [
      { ""name"": ""BodyB"", ""tessellation"": [0, 0, 0] },
      { ""name"": ""BodyA"", ""tessellation"": [0, 0, 0] }
    ],
    ""materialColor"": [0.8, 0.8, 0.8, 1.0],
    ""transform"": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    ""name"": ""Root""
  }
}";

            var normalized = SnapshotNormalizer.Normalize(json);
            var root = (JObject)JToken.Parse(normalized);

            var rootOrder = root.Properties().Select(p => p.Name).ToArray();
            CollectionAssert.AreEqual(new[] { "title", "type", "rootComponent" }, rootOrder);

            var component = (JObject)root["rootComponent"];
            var componentOrder = component.Properties().Select(p => p.Name).ToArray();
            CollectionAssert.AreEqual(
                new[] { "name", "transform", "materialColor", "bodies", "children", "referenceFrames" },
                componentOrder);

            var children = component["children"].Select(c => c["name"].Value<string>()).ToArray();
            CollectionAssert.AreEqual(new[] { "A-Child", "Z-Child" }, children);

            var bodies = component["bodies"].Select(b => b["name"].Value<string>()).ToArray();
            CollectionAssert.AreEqual(new[] { "BodyA", "BodyB" }, bodies);

            var frames = component["referenceFrames"].Select(f => f["name"].Value<string>()).ToArray();
            CollectionAssert.AreEqual(new[] { "FrameA", "FrameB" }, frames);
        }

        [Test]
        public void Normalize_RoundsNumericValues()
        {
            var json = @"{
  ""title"": ""RoundingFixture"",
  ""type"": ""Assembly"",
  ""unitToMeters"": 0.00123456789,
  ""rootComponent"": {
    ""name"": ""Root"",
    ""transform"": [0.12345678, -0.12345678, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    ""materialColor"": [0.33333334, 0.8, 0.8, 1.0],
    ""bodies"": [
      { ""name"": ""BodyA"", ""tessellation"": [0.33333334, 0.66666666, 1.0] }
    ],
    ""children"": [],
    ""referenceFrames"": []
  }
}";

            var normalized = SnapshotNormalizer.Normalize(json);
            var root = (JObject)JToken.Parse(normalized);

            Assert.AreEqual(0.001235, root["unitToMeters"].Value<double>());

            var transform = root["rootComponent"]["transform"].Select(t => t.Value<double>()).ToArray();
            Assert.AreEqual(0.123457, transform[0]);
            Assert.AreEqual(-0.123457, transform[1]);

            var tessellation = root["rootComponent"]["bodies"][0]["tessellation"].Select(t => t.Value<double>()).ToArray();
            Assert.AreEqual(0.333333, tessellation[0]);
            Assert.AreEqual(0.666667, tessellation[1]);
        }

        [Test]
        public void Normalize_IsIdempotent()
        {
            var json = @"{
  ""title"": ""IdempotentFixture"",
  ""type"": ""Assembly"",
  ""rootComponent"": {
    ""name"": ""Root"",
    ""transform"": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    ""materialColor"": [0.8, 0.8, 0.8, 1.0],
    ""bodies"": [],
    ""children"": [],
    ""referenceFrames"": []
  }
}";

            var first = SnapshotNormalizer.Normalize(json);
            var second = SnapshotNormalizer.Normalize(first);

            Assert.AreEqual(first, second);
        }

        [Test]
        public void Normalize_InvalidSchemaThrows()
        {
            var json = @"{
  ""type"": ""Assembly"",
  ""rootComponent"": {
    ""name"": ""Root"",
    ""transform"": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    ""materialColor"": [0.8, 0.8, 0.8, 1.0],
    ""bodies"": [],
    ""children"": [],
    ""referenceFrames"": []
  }
}";

            var ex = Assert.Throws<SnapshotSchemaException>(() => SnapshotNormalizer.Normalize(json));
            StringAssert.Contains("$.title", ex.Errors.FirstOrDefault() ?? ex.Message);
        }
    }
}
