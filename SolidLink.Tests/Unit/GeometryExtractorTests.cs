using NUnit.Framework;
using SolidLink.Addin.Services;
using SolidLink.Tests.Mocks;

namespace SolidLink.Tests.Unit
{
    [TestFixture]
    [Category("Unit")]
    public class GeometryExtractorTests
    {
        [Test]
        public void ExtractBodyGeometry_ScalesPositions()
        {
            // Arrange
            var bodyFixture = new BodyFixture
            {
                Name = "TestBody",
                Tessellation = new float[] { 1, 2, 3, 4, 5, 6, 7, 8, 9 }
            };
            var body = new MockBody(bodyFixture);
            var extractor = new GeometryExtractor();

            // Act
            var geometry = extractor.ExtractBodyGeometry(body, new double[] { 1, 0, 0, 1 }, 0.5);

            // Assert
            Assert.That(geometry, Is.Not.Null);
            Assert.That(geometry.MeshData.Positions[0], Is.EqualTo(0.5f));
            Assert.That(geometry.MeshData.Positions[1], Is.EqualTo(1.0f));
            Assert.That(geometry.MeshData.Positions[2], Is.EqualTo(1.5f));
            Assert.That(geometry.MeshData.Indices.Length, Is.EqualTo(geometry.MeshData.Positions.Length / 3));
        }
    }
}
