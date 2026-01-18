using System;
using System.Collections.Generic;
using System.Linq;
using SolidLink.Addin.Abstractions;

namespace SolidLink.Tests.Mocks
{
    /// <summary>
    /// Mock implementation of IModelDocument that uses fixture data.
    /// </summary>
    public class MockModelDocument : IModelDocument
    {
        private readonly FixtureData _fixtureData;
        private IConfiguration _activeConfiguration;

        public MockModelDocument(FixtureData fixtureData)
        {
            _fixtureData = fixtureData ?? throw new ArgumentNullException(nameof(fixtureData));
        }

        public string Title => _fixtureData.Title;

        public DocumentType Type
        {
            get
            {
                switch (_fixtureData.Type?.ToLower())
                {
                    case "assembly":
                        return DocumentType.Assembly;
                    case "part":
                        return DocumentType.Part;
                    case "drawing":
                        return DocumentType.Drawing;
                    default:
                        return DocumentType.Assembly;
                }
            }
        }

        public IConfiguration ActiveConfiguration
        {
            get
            {
                if (_activeConfiguration == null && _fixtureData.RootComponent != null)
                {
                    _activeConfiguration = new MockConfiguration("Default", _fixtureData.RootComponent);
                }
                return _activeConfiguration;
            }
        }

        public double UnitToMeters => _fixtureData.UnitToMeters ?? 0.0254;

        public IEnumerable<IReferenceFrame> ReferenceFrames => Enumerable.Empty<IReferenceFrame>();
    }
}
