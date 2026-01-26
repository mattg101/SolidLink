using System.Collections.Generic;
using System.Linq;
using SolidLink.Addin.Abstractions;

namespace SolidLink.Tests.Mocks
{
    /// <summary>
    /// Mock implementation of IComponent.
    /// </summary>
    public class MockComponent : IComponent
    {
        private readonly ComponentFixture _fixture;
        private readonly IComponent _parent;
        private List<IComponent> _children;
        private List<IBody> _bodies;
        private List<IReferenceFrame> _referenceFrames;

        public MockComponent(ComponentFixture fixture, IComponent parent)
        {
            _fixture = fixture;
            _parent = parent;
        }

        public string Name => _fixture.Name;

        public IComponent Parent => _parent;

        public IEnumerable<IComponent> Children
        {
            get
            {
                if (_children == null)
                {
                    _children = _fixture.Children?
                        .Select(c => (IComponent)new MockComponent(c, this))
                        .ToList() ?? new List<IComponent>();
                }
                return _children;
            }
        }

        public IModelDocument ModelDoc => null; // For components, this would reference the sub-assembly/part

        public bool IsSuppressed => false;

        public double[] TransformMatrix => _fixture.Transform ?? new double[] { 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 };

        public IEnumerable<IBody> Bodies
        {
            get
            {
                if (_bodies == null)
                {
                    _bodies = _fixture.Bodies?
                        .Select(b => (IBody)new MockBody(b))
                        .ToList() ?? new List<IBody>();
                }
                return _bodies;
            }
        }

        public double[] MaterialColor => _fixture.MaterialColor ?? new double[] { 0.8, 0.8, 0.8, 1.0 };

        public IEnumerable<IReferenceFrame> ReferenceFrames
        {
            get
            {
                if (_referenceFrames == null)
                {
                    _referenceFrames = _fixture.ReferenceFrames?
                        .Select(r => (IReferenceFrame)new MockReferenceFrame(r))
                        .ToList() ?? new List<IReferenceFrame>();
                }
                return _referenceFrames;
            }
        }
    }

    /// <summary>
    /// Mock implementation of IBody.
    /// </summary>
    public class MockBody : IBody
    {
        private readonly BodyFixture _fixture;
        private List<IFace> _faces;

        public MockBody(BodyFixture fixture)
        {
            _fixture = fixture;
        }

        public string Name => _fixture.Name;

        public IEnumerable<IFace> Faces
        {
            get
            {
                if (_faces == null)
                {
                    // Convert tessellation array to a single mock face
                    _faces = new List<IFace>();
                    if (_fixture.Tessellation != null && _fixture.Tessellation.Length > 0)
                    {
                        _faces.Add(new MockFace(_fixture.Tessellation));
                    }
                }
                return _faces;
            }
        }
    }

    /// <summary>
    /// Mock implementation of IFace.
    /// </summary>
    public class MockFace : IFace
    {
        private readonly float[] _triangles;

        public MockFace(float[] triangles)
        {
            _triangles = triangles;
        }

        public float[] GetTessTriangles() => _triangles;
    }

    /// <summary>
    /// Mock implementation of IReferenceFrame.
    /// </summary>
    public class MockReferenceFrame : IReferenceFrame
    {
        private readonly ReferenceFrameFixture _fixture;

        public MockReferenceFrame(ReferenceFrameFixture fixture)
        {
            _fixture = fixture;
        }

        public string Name => _fixture.Name;

        public string Type => _fixture.Type;

        public double[] TransformMatrix => _fixture.Transform ?? new double[] { 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 };
    }
}
