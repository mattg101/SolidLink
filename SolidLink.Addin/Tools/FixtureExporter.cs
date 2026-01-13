using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using Newtonsoft.Json;
using SolidLink.Addin.Adapters;
using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using IBody = SolidLink.Addin.Abstractions.IBody;
using IComponent = SolidLink.Addin.Abstractions.IComponent;
using IModelDocument = SolidLink.Addin.Abstractions.IModelDocument;
using IReferenceFrame = SolidLink.Addin.Abstractions.IReferenceFrame;

namespace SolidLink.Addin.Tools
{
    /// <summary>
    /// Utility for exporting SolidWorks data into JSON fixtures.
    /// </summary>
    public class FixtureExporter
    {
        private readonly SldWorks _swApp;

        public FixtureExporter(SldWorks swApp)
        {
            _swApp = swApp ?? throw new ArgumentNullException(nameof(swApp));
        }

        public void ExportActiveAssembly(string outputPath)
        {
            if (string.IsNullOrWhiteSpace(outputPath))
            {
                throw new ArgumentException("Output path is required.", nameof(outputPath));
            }

            var context = new SolidWorksContext(_swApp);
            var model = context.ActiveModel;
            if (model == null)
            {
                throw new InvalidOperationException("No active document found in SolidWorks.");
            }

            var fixture = BuildFixture(model);
            var json = JsonConvert.SerializeObject(fixture, Formatting.Indented);
            File.WriteAllText(outputPath, json);
        }

        internal FixtureData BuildFixture(IModelDocument model)
        {
            var fixture = new FixtureData
            {
                Title = model.Title,
                Type = model.Type.ToString(),
                UnitToMeters = model.UnitToMeters
            };

            var rootComponent = model.ActiveConfiguration?.RootComponent;
            if (rootComponent != null)
            {
                fixture.RootComponent = BuildComponentFixture(rootComponent);
            }

            return fixture;
        }

        private ComponentFixture BuildComponentFixture(IComponent component)
        {
            var fixture = new ComponentFixture
            {
                Name = component.Name,
                Transform = component.TransformMatrix,
                MaterialColor = component.MaterialColor
            };

            foreach (var body in component.Bodies)
            {
                fixture.Bodies.Add(BuildBodyFixture(body));
            }

            foreach (var child in component.Children)
            {
                fixture.Children.Add(BuildComponentFixture(child));
            }

            foreach (var reference in component.ReferenceFrames ?? Enumerable.Empty<IReferenceFrame>())
            {
                fixture.ReferenceFrames.Add(new ReferenceFrameFixture
                {
                    Name = reference.Name,
                    Type = reference.Type,
                    Transform = reference.TransformMatrix
                });
            }

            return fixture;
        }

        private BodyFixture BuildBodyFixture(IBody body)
        {
            var tessellation = new List<float>();
            foreach (var face in body.Faces)
            {
                var triangles = face.GetTessTriangles();
                if (triangles != null && triangles.Length > 0)
                {
                    tessellation.AddRange(triangles);
                }
            }

            return new BodyFixture
            {
                Name = body.Name,
                Tessellation = tessellation.Count > 0 ? tessellation.ToArray() : new float[0]
            };
        }
    }
}
