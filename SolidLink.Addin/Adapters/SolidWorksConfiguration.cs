using System;
using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks Configuration.
    /// </summary>
    public class SolidWorksConfiguration : IConfiguration, IDisposable
    {
        private readonly ModelDoc2 _model;
        private readonly Configuration _configuration;
        private IComponent _rootComponent;
        private bool _disposed;

        public SolidWorksConfiguration(ModelDoc2 model)
        {
            _model = model;
            _configuration = ComHelpers.SafeCall(() => model?.GetActiveConfiguration() as Configuration);
        }

        public string Name => ComHelpers.SafeCall(() => _configuration?.Name ?? "Default", "Default");

        public IComponent RootComponent
        {
            get
            {
                if (_rootComponent != null)
                {
                    return _rootComponent;
                }

                if (!ComHelpers.SafeCall(() => _model != null
                    && _model.GetType() == (int)swDocumentTypes_e.swDocASSEMBLY, false))
                {
                    return null;
                }

                var rootComp = ComHelpers.SafeCall(() => _configuration?.GetRootComponent3(true) as Component2);
                if (rootComp == null)
                {
                    return null;
                }

                _rootComponent = new SolidWorksComponent(rootComp, null);
                return _rootComponent;
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~SolidWorksConfiguration()
        {
            Dispose(false);
        }

        private void Dispose(bool disposing)
        {
            if (_disposed)
            {
                return;
            }

            ComHelpers.ReleaseComObject(_configuration);
            _disposed = true;
        }
    }
}
