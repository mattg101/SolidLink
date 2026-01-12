using SolidLink.Addin.Abstractions;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks reference features.
    /// </summary>
    public class SolidWorksReferenceFrame : IReferenceFrame
    {
        public SolidWorksReferenceFrame(string name, string type, double[] transformMatrix)
        {
            Name = name;
            Type = type;
            TransformMatrix = transformMatrix ?? CreateIdentityTransform();
        }

        public string Name { get; }

        public string Type { get; }

        public double[] TransformMatrix { get; }

        private static double[] CreateIdentityTransform()
        {
            return new double[] { 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 };
        }
    }
}
