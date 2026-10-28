# OriginFilter sponsorship system (v0.7.0)

## What works now

- Free filtering on supported PC websites remains independent of sponsor settings.
- Users can explicitly opt into OriginFilter-owned sponsored notices.
- Paid campaigns can be activated by inserting a verified advertiser into the packaged `extension/sponsor-catalog.json`.
- After 12 distinct filtered-post candidates in a browser installation on a given UTC day, an eligible campaign can appear in an OriginFilter notice. There is a 30-minute cooldown and a maximum of two placements per UTC day.
- Sponsorships are **visibly labeled** as OriginFilter content, not native X/Facebook/YouTube content.
- Native platform ads are excluded from our content filters wherever the adapter identifies them.
- Campaign fields are validated: active campaign, HTTPS destination, bounded text, no code execution.
- No cross-site tracking, advertising SDK, cookies, or remote scripts are required. Impression opportunities are counted only in extension-local storage.
- Consent can be disabled anytime. The popup contains a clearly marked visual demo; it is not a paid ad.

## What is not sold or running

There are **zero contracted sponsors** in the shipped catalog. Current revenue and payout capability are **$0**. A mock sponsorship test passes, but that cannot generate money. Do **not** pretend a test campaign is a paying advertiser. Automatic billing, Stripe payout onboarding, and store publication still require external account activation and are not possible through repository code alone.

## Activating the first real sponsor

1. Establish a Stripe account or another licensed payment processor with verified payout details. A valid Stripe Payment Link can collect a one-time founding-sponsor fee without a paid website or hosting. This step requires action from the account owner and processor verification; no assistant can invent banking credentials or accept terms for the owner.
2. Publish a real installable version of OriginFilter with an honest store listing. Advertising and data disclosures must be approved.
3. Sell a limited pilot campaign, such as $49 for one month, with **no guaranteed impressions** until audience traffic is measured. State the placement format, opt-in requirement, refund policy, and reporting limitations in the agreement.
4. After payment is confirmed, independently verify the sponsor, inspect its landing site, and add an active entry in `extension/sponsor-catalog.json`:

```json
{
  "version": 1,
  "campaigns": [
    {
      "id": "acme-pilot-1",
      "advertiser": "Example Advertiser",
      "title": "Example description of the offer",
      "description": "Short, truthful description of what a visitor will find.",
      "url": "https://www.example.com/landing-page",
      "active": true,
      "expires": "2027-01-01T00:00:00Z"
    }
  ]
}
```

5. Rebuild and publish the extension update. Sponsorship inventory is packaged as data so the extension uses no remote tracking endpoint. Monetization is only live once real campaigns are activated and payment processing exists.

## Policy warnings

**Chrome Web Store:** Extensions must disclose ads, identify their source, make them removable, and may not interfere with third-party native advertising or website functionality. Affiliate-link substitution without direct user action/benefit is prohibited. **No AdSense** in the extension. An ad's presence in our code does not guarantee store approval.

**Mozilla Add-ons:** Ads injected into webpages must clearly identify the add-on as their origin. Hidden code execution, unapproved tracking, and undisclosed practices are not allowed.

Before submitting any store listing, explicitly describe the opt-in sponsored notices as well as the lack of guaranteed geographic coverage. Store reviewers determine acceptability.

## Revenue reality

If 1,000 daily active users opt in, 50% browse enough to be eligible, and they see an average of one paid ad per day, a hypothetical $3 CPM yields only ~$45 in 30 days. **This is why direct pilot sponsorships are more realistic initially than programmatic CPM revenue.** Real traffic, opt-in rates, geography, fill, advertiser demand and processor fees can dramatically change this estimate.
