using System;
using System.Runtime.InteropServices;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swpublished;
using SolidWorks.Interop.swconst;
using Microsoft.Win32;
using SolidLink.Addin.UI;

namespace SolidLink.Addin
{
    [Guid("D8E9E9E9-1234-4A4A-BBBB-999988887777")]
    [ComVisible(true)]
    public class SwAddin : ISwAddin
    {
        private ISldWorks swApp;
        private int addinID;

        public bool ConnectToSW(object ThisSW, int cookie)
        {
            swApp = (ISldWorks)ThisSW;
            addinID = cookie;

            // Setup callback info
            swApp.SetAddinCallbackInfo(0, this, addinID);

            // TODO: Add UI commands here
            AddCommandMgr();
            
            // DEBUG
            // System.Windows.Forms.MessageBox.Show("SolidLink Connected!");

            return true;
        }
        
        public bool DisconnectFromSW()
        {
            RemoveCommandMgr();

            Marshal.ReleaseComObject(swApp);
            swApp = null;

            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            GC.WaitForPendingFinalizers();

            return true;
        }

        private ICommandManager iCmdMgr;
        
        private void AddCommandMgr()
        {
            iCmdMgr = swApp.GetCommandManager(addinID);
            ICommandGroup cmdGroup = iCmdMgr.CreateCommandGroup(1, "SolidLink", "SolidLink Tools", "", -1);

            cmdGroup.AddCommandItem2("Open SolidLink", -1, "Open SolidLink Window", "Open SolidLink", 0, "OpenSolidLink", "", 0, (int)swCommandItemType_e.swMenuItem | (int)swCommandItemType_e.swToolbarItem);
            
            cmdGroup.HasToolbar = true;
            cmdGroup.HasMenu = true;
            cmdGroup.Activate();
        }

        private void RemoveCommandMgr()
        {
            if (iCmdMgr != null)
            {
                iCmdMgr.RemoveCommandGroup(1);
            }
        }

        public void OpenSolidLink()
        {
            try
            {
                var window = new SolidLinkWindow((SldWorks)swApp);
                window.Show();
            }
            catch (Exception ex)
            {
                System.Windows.Forms.MessageBox.Show("Error opening SolidLink: " + ex.Message);
            }
        }

        #region Registration
        [ComRegisterFunction]
        public static void RegisterFunction(Type t)
        {
            try
            {
                string keyname = "SOFTWARE\\SolidWorks\\Addins\\{" + t.GUID.ToString() + "}";
                RegistryKey addinkey = Registry.LocalMachine.CreateSubKey(keyname);
                addinkey.SetValue(null, 0);
                addinkey.SetValue("Description", "SolidLink Robot Exporter");
                addinkey.SetValue("Title", "SolidLink");

                keyname = "Software\\SolidWorks\\AddInsStartup\\{" + t.GUID.ToString() + "}";
                addinkey = Registry.CurrentUser.CreateSubKey(keyname);
                addinkey.SetValue(null, 1, RegistryValueKind.DWord);
            }
            catch (Exception e)
            {
                Console.WriteLine("Error registering addin: " + e.Message);
            }
        }

        [ComUnregisterFunction]
        public static void UnregisterFunction(Type t)
        {
            try
            {
                string keyname = "SOFTWARE\\SolidWorks\\Addins\\{" + t.GUID.ToString() + "}";
                Registry.LocalMachine.DeleteSubKey(keyname, false);

                keyname = "Software\\SolidWorks\\AddInsStartup\\{" + t.GUID.ToString() + "}";
                Registry.CurrentUser.DeleteSubKey(keyname, false);
            }
            catch (Exception e)
            {
                Console.WriteLine("Error unregistering addin: " + e.Message);
            }
        }
        #endregion
    }
}
