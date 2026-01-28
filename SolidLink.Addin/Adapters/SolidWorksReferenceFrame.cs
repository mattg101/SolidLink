using SolidLink.Addin.Abstractions;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks reference features.
    /// </summary>
    public class SolidWorksReferenceFrame : IReferenceFrame
    {
        public SolidWorksReferenceFrame(string name, string type, double[] transformMatrix, double[] axisDirection = null)
        {
            Name = name;
            Type = type;
            TransformMatrix = transformMatrix ?? CreateIdentityTransform();
            AxisDirection = axisDirection;
        }

        public string Name { get; }

        public string Type { get; }

        public double[] TransformMatrix { get; }

        public double[] AxisDirection { get; }

        private static double[] CreateIdentityTransform()
        {
            return new double[] { 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 };
        }
    }
}
