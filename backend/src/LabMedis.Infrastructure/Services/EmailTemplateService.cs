using System.Text;

namespace LabMedis.Infrastructure.Services;

public static class EmailTemplateService
{
    private const string BrandDark   = "#0f4210";
    private const string BrandGreen  = "#1a6e1a";
    private const string BrandLight  = "#27a327";
    private const string BgLight     = "#F4FAF4";
    private const string CardBg      = "#FFFFFF";
    private const string TextColor   = "#1a1a1a";
    private const string MutedColor  = "#555f55";
    private const string BorderColor = "#D4E8D4";

    public static string WrapInLayout(
        string title,
        string preheader,
        string badgeText,
        string bodyContent,
        string? actionButtonText = null,
        string? actionButtonUrl = null)
    {
        var sb = new StringBuilder();
        sb.Append($@"<!DOCTYPE html>
<html lang=""fr"" xmlns=""http://www.w3.org/1999/xhtml"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>{title}</title>
</head>
<body style=""margin:0;padding:0;background-color:{BgLight};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{TextColor};line-height:1.5;"">
  <div style=""display:none;max-height:0;overflow:hidden;font-size:1px;color:{BgLight};"">
    {preheader} &zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""background-color:{BgLight};padding:28px 12px;"">
    <tr><td align=""center"">
      <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""max-width:600px;background-color:{CardBg};border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(15,66,16,0.10);border:1px solid {BorderColor};"">
        <tr><td height=""4"" style=""background-color:{BrandLight};font-size:4px;line-height:4px;"">&nbsp;</td></tr>
        <tr>
          <td align=""center"" style=""background-color:{BrandGreen};padding:28px 24px;text-align:center;"">
            <div style=""color:#D4F5D4;font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;margin-bottom:5px;"">GROSSISTE DÉPOSITAIRE PHARMACEUTIQUE</div>
            <div style=""color:#FFFFFF;font-size:24px;font-weight:900;letter-spacing:2px;text-transform:uppercase;font-family:Georgia,serif;"">LabMedis</div>
            <div style=""color:rgba(255,255,255,0.75);font-size:11px;margin-top:3px;letter-spacing:0.5px;"">Lomé, TOGO — labmedis-togo.com</div>
          </td>
        </tr>
        <tr>
          <td align=""center"" style=""background-color:#F0FAF0;border-bottom:1px solid {BorderColor};padding:9px 20px;text-align:center;"">
            <span style=""font-size:10.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:{BrandDark};"">
              {badgeText}
            </span>
          </td>
        </tr>
        <tr>
          <td style=""padding:28px 28px 20px 28px;"">
            {bodyContent}
            {(string.IsNullOrEmpty(actionButtonText) ? "" : $@"
            <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""margin-top:26px;margin-bottom:10px;"">
              <tr><td align=""center"">
                <a href=""{actionButtonUrl}"" style=""display:inline-block;background-color:{BrandGreen};color:#FFFFFF;font-size:13px;font-weight:800;text-decoration:none;padding:12px 28px;border-radius:6px;letter-spacing:0.8px;text-transform:uppercase;box-shadow:0 2px 8px rgba(15,66,16,0.25);"">
                  {actionButtonText}
                </a>
              </td></tr>
            </table>
            ")}
          </td>
        </tr>
        <tr>
          <td style=""background-color:#F0FAF0;border-top:1px solid {BorderColor};padding:20px 24px;text-align:center;"">
            <p style=""margin:0 0 4px 0;font-size:12px;font-weight:800;color:{BrandGreen};"">LabMedis SARL</p>
            <p style=""margin:0 0 4px 0;font-size:11px;color:{MutedColor};"">Lomé, TOGO · Tél : (+228) 90 00 00 00</p>
            <p style=""margin:0;font-size:10.5px;color:{MutedColor};"">
              Email : <a href=""mailto:contact@labmedis-togo.com"" style=""color:{BrandGreen};text-decoration:none;font-weight:600;"">contact@labmedis-togo.com</a> ·
              Site : <a href=""https://labmedis-togo.com"" style=""color:{BrandGreen};text-decoration:none;font-weight:600;"">labmedis-togo.com</a>
            </p>
            <p style=""margin:10px 0 0 0;font-size:9.5px;color:#888;"">Cet email a été envoyé automatiquement par la plateforme LabMedis.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>");
        return sb.ToString();
    }

    public static string BuildPurchaseOrderEmail(
        string supplierName,
        string orderRef,
        DateOnly orderDate,
        string currency,
        IEnumerable<(string Label, int Qty, string Unit)> lines,
        string? notes)
    {
        var lineRows = new StringBuilder();
        int i = 0;
        foreach (var (label, qty, unit) in lines)
        {
            var bg = i++ % 2 == 1 ? "#F0FAF0" : "#FFFFFF";
            lineRows.Append($@"
            <tr style=""background-color:{bg};"">
              <td style=""border:1px solid {BorderColor};padding:7px 10px;font-size:12.5px;"">{label}</td>
              <td style=""border:1px solid {BorderColor};padding:7px 10px;text-align:center;font-size:12.5px;font-weight:700;"">{qty}</td>
              <td style=""border:1px solid {BorderColor};padding:7px 10px;text-align:center;font-size:12px;color:{MutedColor};"" >{unit}</td>
            </tr>");
        }

        var body = $@"
        <h2 style=""margin:0 0 8px 0;font-size:18px;font-weight:800;color:{BrandGreen};"">Bon de commande {orderRef}</h2>
        <p style=""margin:0 0 18px 0;font-size:13px;color:{MutedColor};"">
          Veuillez trouver ci-dessous notre bon de commande du <strong>{orderDate:dd/MM/yyyy}</strong>.
          Nous vous remercions de bien vouloir confirmer la réception et le délai de livraison.
        </p>
        <div style=""background-color:#F0FAF0;border:1px solid {BorderColor};border-radius:8px;padding:12px 16px;margin-bottom:18px;"">
          <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""font-size:12px;color:{TextColor};"">
            <tr>
              <td style=""width:130px;color:{MutedColor};padding:3px 0;"">Référence :</td>
              <td style=""font-weight:700;color:{BrandGreen};padding:3px 0;"">{orderRef}</td>
            </tr>
            <tr>
              <td style=""color:{MutedColor};padding:3px 0;"">Date :</td>
              <td style=""font-weight:600;padding:3px 0;"">{orderDate:dd/MM/yyyy}</td>
            </tr>
            <tr>
              <td style=""color:{MutedColor};padding:3px 0;"">Devise :</td>
              <td style=""padding:3px 0;"">{currency}</td>
            </tr>
            <tr>
              <td style=""color:{MutedColor};padding:3px 0;"">Fournisseur :</td>
              <td style=""font-weight:600;padding:3px 0;"">{supplierName}</td>
            </tr>
          </table>
        </div>
        <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""border-collapse:collapse;margin-bottom:18px;"">
          <thead>
            <tr style=""background-color:{BrandGreen};"">
              <th style=""border:1px solid {BrandGreen};padding:8px 10px;text-align:left;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;"">Désignation</th>
              <th style=""border:1px solid {BrandGreen};padding:8px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;width:80px;"">Qté</th>
              <th style=""border:1px solid {BrandGreen};padding:8px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;width:90px;"">Unité</th>
            </tr>
          </thead>
          <tbody>
            {lineRows}
          </tbody>
        </table>
        {(string.IsNullOrWhiteSpace(notes) ? "" : $@"
        <div style=""border-left:3px solid {BrandLight};background-color:#F8FFF8;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:16px;"">
          <div style=""font-size:10px;font-weight:800;text-transform:uppercase;color:{BrandGreen};margin-bottom:3px;"">Observations</div>
          <div style=""font-size:12.5px;color:{TextColor};font-style:italic;"">{notes}</div>
        </div>
        ")}
        <p style=""margin:0;font-size:12px;color:{MutedColor};"">
          Cordialement,<br/>
          <strong style=""color:{BrandGreen};"">L'équipe LabMedis</strong>
        </p>";

        return WrapInLayout(
            title: $"Bon de commande {orderRef} — LabMedis",
            preheader: $"Bon de commande {orderRef} du {orderDate:dd/MM/yyyy} — {supplierName}",
            badgeText: "BON DE COMMANDE FOURNISSEUR",
            bodyContent: body,
            actionButtonText: null,
            actionButtonUrl: null
        );
    }

    public static string BuildUserInvitationEmail(
        string? fullName,
        string userName,
        string email,
        string tempPassword,
        string appUrl)
    {
        var displayName = string.IsNullOrEmpty(fullName) ? userName : fullName;
        var loginUrl = $"{appUrl}/login";

        var body = $@"
        <h2 style=""margin:0 0 8px 0;font-size:18px;font-weight:800;color:{BrandGreen};"">Bienvenue sur LabMedis, {displayName} !</h2>
        <p style=""margin:0 0 16px 0;font-size:13px;color:{MutedColor};line-height:1.6;"">
          Un compte a été créé pour vous sur la plateforme de gestion LabMedis.
          Vous trouverez ci-dessous vos identifiants de connexion provisoires.
        </p>
        <div style=""background-color:#F0FAF0;border:1px solid {BorderColor};border-radius:8px;padding:16px;margin-bottom:18px;"">
          <div style=""font-size:10px;font-weight:800;text-transform:uppercase;color:{BrandGreen};letter-spacing:1px;margin-bottom:10px;"">Vos identifiants</div>
          <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""font-size:13px;color:{TextColor};"">
            <tr>
              <td style=""width:120px;color:{MutedColor};padding:4px 0;"">Identifiant :</td>
              <td style=""font-weight:700;padding:4px 0;"">{userName}</td>
            </tr>
            <tr>
              <td style=""color:{MutedColor};padding:4px 0;"">Email :</td>
              <td style=""padding:4px 0;"">{email}</td>
            </tr>
            <tr>
              <td style=""color:{MutedColor};padding:4px 0;"">Mot de passe :</td>
              <td style=""padding:4px 0;"">
                <span style=""font-family:monospace;font-size:14px;font-weight:700;background-color:#E8F5E8;padding:2px 8px;border-radius:4px;color:{BrandDark};"">
                  {tempPassword}
                </span>
              </td>
            </tr>
          </table>
        </div>
        <div style=""border-left:3px solid #e8a020;background-color:#FFFBF0;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:18px;"">
          <div style=""font-size:11.5px;color:#7a5500;"">
            ⚠️ Ce mot de passe est <strong>temporaire</strong>. Vous devrez le changer lors de votre première connexion.
          </div>
        </div>
        <p style=""margin:0;font-size:12px;color:{MutedColor};"">
          Pour toute question, contactez votre administrateur système.
        </p>";

        return WrapInLayout(
            title: "Invitation LabMedis — Vos identifiants de connexion",
            preheader: $"Bienvenue {displayName} — vos identifiants LabMedis",
            badgeText: "INVITATION — NOUVEL UTILISATEUR",
            bodyContent: body,
            actionButtonText: "Accéder à LabMedis",
            actionButtonUrl: loginUrl
        );
    }

    public static string BuildPasswordResetEmail(
        string? fullName,
        string userName,
        string resetUrl,
        string appUrl)
    {
        var displayName = string.IsNullOrEmpty(fullName) ? userName : fullName;

        var body = $@"
        <h2 style=""margin:0 0 8px 0;font-size:18px;font-weight:800;color:{BrandGreen};"">Réinitialisation de mot de passe</h2>
        <p style=""margin:0 0 16px 0;font-size:13px;color:{MutedColor};line-height:1.6;"">
          Bonjour <strong>{displayName}</strong>,<br/>
          Vous avez demandé la réinitialisation de votre mot de passe LabMedis.
          Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
        </p>
        <div style=""border-left:3px solid {BrandLight};background-color:#F8FFF8;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:18px;"">
          <div style=""font-size:11.5px;color:{MutedColor};"">
            Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas fait cette demande, ignorez cet email.
          </div>
        </div>
        <p style=""margin:0;font-size:12px;color:{MutedColor};"">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
          <a href=""{resetUrl}"" style=""color:{BrandGreen};font-size:11px;word-break:break-all;"">{resetUrl}</a>
        </p>";

        return WrapInLayout(
            title: "Réinitialisation de mot de passe — LabMedis",
            preheader: $"Réinitialisez votre mot de passe LabMedis, {displayName}",
            badgeText: "RÉINITIALISATION DE MOT DE PASSE",
            bodyContent: body,
            actionButtonText: "Réinitialiser mon mot de passe",
            actionButtonUrl: resetUrl
        );
    }
}
