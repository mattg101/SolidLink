using System;
using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Wraps a SolidWorks SldWorks instance with the abstraction layer.
    /// </summary>
    public class SolidWorksContext : ISolidWorksContext
    {
        private readonly SldWorks _swApp;

        public SolidWorksContext(SldWorks app)
        {
            _swApp = app ?? throw new ArgumentNullException(nameof(app));
        }

        public IModelDocument ActiveModel
        {
            get
            {
                return ComHelpers.SafeCall(() =>
                {
                    var model = _swApp.ActiveDoc as ModelDoc2;
                    return model == null ? null : new SolidWorksModelDocument(model);
                });
            }
        }

        public bool IsConnected => _swApp != null;
    }
}
