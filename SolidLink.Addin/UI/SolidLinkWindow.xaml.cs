using System;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace SolidLink.Addin.UI
{
    public partial class SolidLinkWindow : Window
    {
        public SolidLinkWindow()
        {
            InitializeComponent();
            InitializeWebView();
        }

        private async void InitializeWebView()
        {
            try
            {
                string userDataFolder = System.IO.Path.Combine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData), "SolidLink");
                System.IO.Directory.CreateDirectory(userDataFolder);

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await webView.EnsureCoreWebView2Async(env);
                
                // For development, point to localhost. For production, this will point to embedded assets.
                // TODO: Make this configurable
                webView.Source = new Uri("http://localhost:5173");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to initialize WebView2: " + ex.Message);
            }
        }
    }
}
