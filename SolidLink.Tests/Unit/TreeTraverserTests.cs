using NUnit.Framework;
using SolidLink.Addin.Services;
using SolidLink.Tests.Mocks;
using System.IO;
using System.Linq;

namespace SolidLink.Tests.Unit
{
    /// <summary>
    /// Unit tests for tree traversal logic using mock fixtures.
    /// These tests run without SolidWorks.
    /// </summary>
    [TestFixture]
    [Category("Unit")]
    public class TreeTraverserTests
    {
        private string _fixturesPath;

        [SetUp]
        public void SetUp()
        {
            // Get path to fixtures directory relative to test assembly
            var assemblyDir = Path.GetDirectoryName(typeof(TreeTraverserTests).Assembly.Location);
            _fixturesPath = Path.Combine(assemblyDir, "Fixtures");
        }

        [Test]
        public void MockContext_LoadsFixture_ReturnsValidModel()
        {
            // Arrange
            var fixturePath = Path.Combine(_fixturesPath, "assembly_simple.json");
            
            // Act
            var context = new MockSolidWorksContext(fixturePath);
            
            // Assert
            Assert.That(context.IsConnected, Is.True);
            Assert.That(context.ActiveModel, Is.Not.Null);
            Assert.That(context.ActiveModel.Title, Is.EqualTo("SimpleRobot"));
            Assert.That(context.ActiveModel.Type, Is.EqualTo(Addin.Abstractions.DocumentType.Assembly));
        }

        [Test]
        public void MockContext_ActiveConfiguration_HasRootComponent()
        {
            // Arrange
            var fixturePath = Path.Combine(_fixturesPath, "assembly_simple.json");
            var context = new MockSolidWorksContext(fixturePath);
            
            // Act
            var config = context.ActiveModel.ActiveConfiguration;
            
            // Assert
            Assert.That(config, Is.Not.Null);
            Assert.That(config.Name, Is.EqualTo("Default"));
            Assert.That(config.RootComponent, Is.Not.Null);
            Assert.That(config.RootComponent.Name, Is.EqualTo("Base-1"));
        }

        [Test]
        public void MockComponent_Children_ReturnsNestedHierarchy()
        {
            // Arrange
            var fixturePath = Path.Combine(_fixturesPath, "assembly_simple.json");
            var context = new MockSolidWorksContext(fixturePath);
            var root = context.ActiveModel.ActiveConfiguration.RootComponent;
            
            // Act
            var children = root.Children.ToList();
            
            // Assert
            Assert.That(children.Count, Is.EqualTo(1));
            Assert.That(children[0].Name, Is.EqualTo("Arm-1"));
            
            // Check grandchildren
            var grandchildren = children[0].Children.ToList();
            Assert.That(grandchildren.Count, Is.EqualTo(1));
            Assert.That(grandchildren[0].Name, Is.EqualTo("EndEffector-1"));
        }

        [Test]
        public void MockComponent_TransformMatrix_ReturnsValidData()
        {
            // Arrange
            var fixturePath = Path.Combine(_fixturesPath, "assembly_simple.json");
            var context = new MockSolidWorksContext(fixturePath);
            var root = context.ActiveModel.ActiveConfiguration.RootComponent;
            
            // Act
            var transform = root.TransformMatrix;
            
            // Assert
            Assert.That(transform, Is.Not.Null);
            Assert.That(transform.Length, Is.EqualTo(13)); // SolidWorks MathTransform.ArrayData format
        }

        [Test]
        public void MockComponent_Bodies_ReturnsTessellationData()
        {
            // Arrange
            var fixturePath = Path.Combine(_fixturesPath, "assembly_simple.json");
            var context = new MockSolidWorksContext(fixturePath);
            var root = context.ActiveModel.ActiveConfiguration.RootComponent;
            
            // Act
            var bodies = root.Bodies.ToList();
            
            // Assert
            Assert.That(bodies.Count, Is.EqualTo(1));
            Assert.That(bodies[0].Name, Is.EqualTo("Base Body"));
            
            var faces = bodies[0].Faces.ToList();
            Assert.That(faces.Count, Is.EqualTo(1));
            
            var triangles = faces[0].GetTessTriangles();
            Assert.That(triangles, Is.Not.Null);
            Assert.That(triangles.Length, Is.GreaterThan(0));
            Assert.That(triangles.Length % 9, Is.EqualTo(0)); // Should be multiple of 9 (3 vertices * 3 coords)
        }

        [Test]
        public void CountTreeNodes_ReturnsCorrectCount()
        {
            // Arrange
            var fixturePath = Path.Combine(_fixturesPath, "assembly_simple.json");
            var context = new MockSolidWorksContext(fixturePath);
            var root = context.ActiveModel.ActiveConfiguration.RootComponent;
            
            // Act
            int count = CountNodes(root);
            
            // Assert
            Assert.That(count, Is.EqualTo(3)); // Base, Arm, EndEffector
        }

        private int CountNodes(Addin.Abstractions.IComponent component)
        {
            int count = 1;
            foreach (var child in component.Children)
            {
                count += CountNodes(child);
            }
            return count;
        }

        [Test]
        public void TreeTraverser_ExtractModel_ReturnsFrameHierarchy()
        {
            // Arrange
            var fixturePath = Path.Combine(_fixturesPath, "assembly_simple.json");
            var context = new MockSolidWorksContext(fixturePath);
            var traverser = new TreeTraverser(context);

            // Act
            var model = traverser.ExtractModel(context.ActiveModel);

            // Assert
            Assert.That(model, Is.Not.Null);
            Assert.That(model.RootFrame, Is.Not.Null);
            Assert.That(model.RootFrame.Name, Is.EqualTo("Base-1"));
            Assert.That(model.RootFrame.Links.Count, Is.EqualTo(1));
            Assert.That(model.RootFrame.Children.Count, Is.EqualTo(1));
            Assert.That(model.RootFrame.Children[0].Name, Is.EqualTo("Arm-1"));
        }

        [Test]
        public void TreeTraverser_ReferenceFrames_AreIncluded()
        {
            // Arrange
            var fixturePath = Path.Combine(_fixturesPath, "assembly_with_coordsys.json");
            var context = new MockSolidWorksContext(fixturePath);
            var traverser = new TreeTraverser(context);

            // Act
            var model = traverser.ExtractModel(context.ActiveModel);

            // Assert
            var root = model.RootFrame;
            Assert.That(root.Children.Any(c => c.Type == "COORDSYS"), Is.True);
        }
    }
}
