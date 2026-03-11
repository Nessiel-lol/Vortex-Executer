using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;

namespace Vortex;

public partial class MainWindow : Window
{
    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    private const int WM_NCLBUTTONDOWN = 0xA1;
    private static readonly IntPtr HT_CAPTION = new(0x2);
    private const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
    private const int DWMWCP_ROUND = 2;

    private static readonly HttpClient _http = new();

    private string ScriptsFolder => System.IO.Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory, "scripts");

    public MainWindow()
    {
        InitializeComponent();
        Loaded += async (_, _) =>
        {
            ApplyRoundedCorners();
            await InitializeWebViewAsync();
        };
    }

    private void ApplyRoundedCorners()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        int preference = DWMWCP_ROUND;
        DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, ref preference, sizeof(int));
    }

    private async Task InitializeWebViewAsync()
    {
        var env = await CoreWebView2Environment.CreateAsync(
            userDataFolder: System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Vortex", "WebView2"));

        await webView.EnsureCoreWebView2Async(env);

        var settings = webView.CoreWebView2.Settings;
        settings.AreDefaultContextMenusEnabled = false;
        settings.IsZoomControlEnabled = false;
        settings.AreBrowserAcceleratorKeysEnabled = false;
        settings.IsStatusBarEnabled = false;
        settings.IsSwipeNavigationEnabled = false;
#if DEBUG
        settings.AreDevToolsEnabled = true;
#else
        settings.AreDevToolsEnabled = false;
#endif

        webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

        // Prevent white flash — set background to match app theme
        webView.DefaultBackgroundColor = System.Drawing.Color.FromArgb(255, 9, 9, 11);

        string distPath = System.IO.Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "wwwroot");

        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "vortex.ui",
            distPath,
            CoreWebView2HostResourceAccessKind.Allow);

        webView.CoreWebView2.Navigate("http://vortex.ui/index.html");
    }

    private void StartDrag()
    {
        ReleaseCapture();
        var hwnd = new WindowInteropHelper(this).Handle;
        SendMessage(hwnd, WM_NCLBUTTONDOWN, HT_CAPTION, IntPtr.Zero);
    }

    private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string raw = e.WebMessageAsJson;

        JsonElement msg;
        try
        {
            msg = JsonSerializer.Deserialize<JsonElement>(raw);
        }
        catch
        {
            return;
        }

        if (!msg.TryGetProperty("action", out var actionProp))
            return;

        string action = actionProp.GetString() ?? "";

        switch (action)
        {
            case "drag":
                Dispatcher.BeginInvoke(() =>
                {
                    if (WindowState == WindowState.Maximized)
                        WindowState = WindowState.Normal;
                    StartDrag();
                });
                break;

            case "minimize":
                Dispatcher.BeginInvoke(() => WindowState = WindowState.Minimized);
                break;

            case "maximize":
                Dispatcher.BeginInvoke(() =>
                {
                    WindowState = WindowState == WindowState.Maximized
                        ? WindowState.Normal
                        : WindowState.Maximized;
                });
                break;

            case "close":
                Dispatcher.BeginInvoke(() => Application.Current.Shutdown());
                break;

            case "inject":
                var injectResult = ExecutorAPI.Inject();
                await SendToReact("injectResult", new
                {
                    success = injectResult.Success,
                    message = injectResult.Message
                });
                break;

            case "execute":
            {
                string script = "";
                if (msg.TryGetProperty("script", out var scriptProp))
                    script = scriptProp.GetString() ?? "";

                var execResult = ExecutorAPI.Execute(script);
                await SendToReact("executeResult", new
                {
                    success = execResult.Success,
                    message = execResult.Message
                });
                break;
            }

            case "listScripts":
                await HandleListScripts();
                break;

            case "saveScript":
                await HandleSaveScript(msg);
                break;

            case "loadScript":
                await HandleLoadScript(msg);
                break;

            case "loadAndExecute":
                await HandleLoadAndExecute(msg);
                break;

            case "openFile":
                await Dispatcher.InvokeAsync(async () => await HandleOpenFile());
                break;

            case "searchCloud":
                await HandleSearchCloud(msg);
                break;

            case "fetchRawScript":
                await HandleFetchRawScript(msg);
                break;

            case "deleteScript":
                await HandleDeleteScript(msg);
                break;
        }
    }

    private async Task HandleListScripts()
    {
        if (!System.IO.Directory.Exists(ScriptsFolder))
            System.IO.Directory.CreateDirectory(ScriptsFolder);

        var files = System.IO.Directory.GetFiles(ScriptsFolder, "*.lua")
            .Select(System.IO.Path.GetFileName)
            .Where(f => f != null)
            .ToArray();

        await SendToReact("scriptList", new { scripts = files });
    }

    private async Task HandleSaveScript(JsonElement msg)
    {
        string fileName = msg.TryGetProperty("fileName", out var fn) ? fn.GetString() ?? "" : "";
        string content = msg.TryGetProperty("content", out var ct) ? ct.GetString() ?? "" : "";

        if (string.IsNullOrWhiteSpace(fileName))
        {
            await SendToReact("scriptSaved", new { success = false, message = "File name is empty." });
            return;
        }

        try
        {
            if (!System.IO.Directory.Exists(ScriptsFolder))
                System.IO.Directory.CreateDirectory(ScriptsFolder);

            string path = System.IO.Path.Combine(ScriptsFolder, fileName);
            await System.IO.File.WriteAllTextAsync(path, content);
            await SendToReact("scriptSaved", new { success = true, message = $"Saved {fileName}" });
        }
        catch (Exception ex)
        {
            await SendToReact("scriptSaved", new { success = false, message = $"Save failed: {ex.Message}" });
        }
    }

    private async Task HandleLoadScript(JsonElement msg)
    {
        string fileName = msg.TryGetProperty("fileName", out var fn) ? fn.GetString() ?? "" : "";

        string path = System.IO.Path.Combine(ScriptsFolder, fileName);
        if (!System.IO.File.Exists(path))
        {
            await SendToReact("scriptLoaded", new { name = fileName, content = "-- File not found" });
            return;
        }

        string content = await System.IO.File.ReadAllTextAsync(path);
        await SendToReact("scriptLoaded", new { name = fileName, content });
    }

    private async Task HandleLoadAndExecute(JsonElement msg)
    {
        string fileName = msg.TryGetProperty("fileName", out var fn) ? fn.GetString() ?? "" : "";

        string path = System.IO.Path.Combine(ScriptsFolder, fileName);
        if (!System.IO.File.Exists(path))
        {
            await SendToReact("executeResult", new { success = false, message = $"{fileName} not found." });
            return;
        }

        string content = await System.IO.File.ReadAllTextAsync(path);
        var result = ExecutorAPI.Execute(content);
        await SendToReact("executeResult", new
        {
            success = result.Success,
            message = result.Message
        });
    }

    private async Task HandleOpenFile()
    {
        if (!System.IO.Directory.Exists(ScriptsFolder))
            System.IO.Directory.CreateDirectory(ScriptsFolder);

        var dialog = new OpenFileDialog
        {
            InitialDirectory = ScriptsFolder,
            Filter = "Lua Scripts (*.lua)|*.lua|All files (*.*)|*.*",
            Title = "Open Script"
        };

        if (dialog.ShowDialog() == true)
        {
            string content = await System.IO.File.ReadAllTextAsync(dialog.FileName);
            string name = System.IO.Path.GetFileName(dialog.FileName);
            await SendToReact("fileOpened", new { name, content });
        }
    }

    private async Task HandleDeleteScript(JsonElement msg)
    {
        string fileName = msg.TryGetProperty("fileName", out var fn) ? fn.GetString() ?? "" : "";
        string path = System.IO.Path.Combine(ScriptsFolder, fileName);
        try
        {
            if (System.IO.File.Exists(path))
                System.IO.File.Delete(path);
            await SendToReact("scriptDeleted", new { success = true, message = $"Deleted {fileName}" });
            await HandleListScripts();
        }
        catch (Exception ex)
        {
            await SendToReact("scriptDeleted", new { success = false, message = $"Delete failed: {ex.Message}" });
        }
    }

    private async Task HandleSearchCloud(JsonElement msg)
    {
        string q = msg.TryGetProperty("q", out var qp) ? qp.GetString() ?? "" : "";
        int page = msg.TryGetProperty("page", out var pp) ? pp.GetInt32() : 1;
        string orderBy = msg.TryGetProperty("orderBy", out var ob) ? ob.GetString() ?? "date" : "date";
        string filter = msg.TryGetProperty("filter", out var fp) ? fp.GetString() ?? "" : "";

        try
        {
            string url = $"https://rscripts.net/api/v2/scripts?page={page}&orderBy={orderBy}&sort=desc";
            if (!string.IsNullOrWhiteSpace(q))
                url += $"&q={Uri.EscapeDataString(q)}";

            string json = await _http.GetStringAsync(url);
            var doc = JsonSerializer.Deserialize<JsonElement>(json);

            var scripts = new List<object>();
            if (doc.TryGetProperty("scripts", out var arr))
            {
                foreach (var s in arr.EnumerateArray())
                {
                    bool hasKey = s.TryGetProperty("keySystem", out var ks) && ks.GetBoolean();
                    bool verified = false;
                    string username = "";
                    if (s.TryGetProperty("user", out var user))
                    {
                        username = user.TryGetProperty("username", out var un) ? un.GetString() ?? "" : "";
                        verified = user.TryGetProperty("verified", out var vf) && vf.GetBoolean();
                    }

                    // Apply client-side filtering
                    if (filter == "nokey" && hasKey) continue;
                    if (filter == "verified" && !verified) continue;

                    string gameTitle = "";
                    if (s.TryGetProperty("game", out var game))
                        gameTitle = game.TryGetProperty("title", out var gt) ? gt.GetString() ?? "" : "";

                    scripts.Add(new
                    {
                        id = s.TryGetProperty("_id", out var id) ? id.GetString() : "",
                        title = s.TryGetProperty("title", out var t) ? t.GetString() : "",
                        image = s.TryGetProperty("image", out var img) ? img.GetString() : "",
                        views = s.TryGetProperty("views", out var v) ? v.GetInt32() : 0,
                        likes = s.TryGetProperty("likes", out var l) ? l.GetInt32() : 0,
                        keySystem = hasKey,
                        rawScript = s.TryGetProperty("rawScript", out var rs) ? rs.GetString() : "",
                        username,
                        verified,
                        game = gameTitle
                    });
                }
            }

            int maxPages = 1;
            if (doc.TryGetProperty("info", out var info) && info.TryGetProperty("maxPages", out var mp))
                maxPages = mp.GetInt32();

            await SendToReact("cloudScripts", new { scripts, page, maxPages });
        }
        catch (Exception ex)
        {
            await SendToReact("cloudScripts", new { scripts = Array.Empty<object>(), page = 1, maxPages = 1, error = ex.Message });
        }
    }

    private async Task HandleFetchRawScript(JsonElement msg)
    {
        string url = msg.TryGetProperty("url", out var u) ? u.GetString() ?? "" : "";
        string title = msg.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
        string intent = msg.TryGetProperty("intent", out var i) ? i.GetString() ?? "" : "";

        try
        {
            string content = await _http.GetStringAsync(url);
            await SendToReact("rawScriptFetched", new { title, content, intent });
        }
        catch (Exception ex)
        {
            await SendToReact("rawScriptFetched", new { title, content = $"-- Failed to fetch: {ex.Message}", intent, error = ex.Message });
        }
    }

    private async Task SendToReact(string eventName, object payload)
    {
        string json = JsonSerializer.Serialize(payload);
        string js = $"window.dispatchEvent(new CustomEvent('{eventName}', {{ detail: {json} }}));";
        await webView.CoreWebView2.ExecuteScriptAsync(js);
    }
}