// The privacy policy, shown in-app from Settings.
//
// The same text as canucklegame.ca/privacy/. Every game carries its own copy
// (privacy_policy.dart in each), so a change to the policy goes to the site
// page, here and every game together, with LAST_UPDATED moved on.

import { h, openSheet, sheetHead } from './ui.js?v=202610141420';

export const LAST_UPDATED = 'October 2, 2026';

// [kind, text, label?]: 'h' a numbered heading, 'p' a paragraph, 'li' a
// bullet. A label is the bold lead-in of a paragraph.
export const POLICY = [
  ['p', 'At Canuckle, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains what information may be collected when you visit canucklegame.ca or use Canuckle, Canuckle+, Canoku, and other games or features available through our website (collectively, the “Services”), how we use that information, and the choices available to you.'],
  ['p', 'You can play our games without creating an account or providing your name, email address, or other identifying information.'],

  ['h', '1. Information we collect'],
  ['p', 'Canuckle automatically assigns each player a unique User ID. You may choose to provide your email address for recovery purposes, in which case it is linked to your Canuckle User ID so that we can locate your game information in our database if you need assistance recovering it. Providing an email address is optional and is not required to play Canuckle. We use your email address for recovery purposes only.', 'Optional Email Address:'],
  ['p', 'When you use our Services, certain technical and usage information may be collected automatically. This may include your IP address, browser and device type, operating system, general location, referring website, and information about how and when you use our Services.', 'Technical and Usage Information:'],
  ['p', 'This information may be collected through server logs, cookies, analytics tools, and similar technologies and is primarily used to operate, secure, analyze, and improve our Services.'],
  ['p', 'If you contact Canuckle directly, we may also receive information you choose to provide, such as your name, email address, and the contents of your message.', 'Information You Provide:'],

  ['h', '2. How do we use your information?'],
  ['p', 'We use the information we collect to:'],
  ['li', 'provide game data recovery assistance when requested;'],
  ['li', 'operate and maintain our games and website;'],
  ['li', 'understand how players use our Services;'],
  ['li', 'improve website performance, games, features, and the player experience;'],
  ['li', 'troubleshoot technical problems and maintain security; and'],
  ['li', 'respond to questions, feedback, or other communications.'],
  ['p', 'Where possible, we use aggregated or anonymized information for analytics and reporting.'],

  ['h', '3. Will your information be shared with anyone?'],
  ['p', 'We may share limited information with trusted third-party service providers that help us host, operate, secure, analyze, or improve our Services. Our use of third-party advertising services is described in Section 4 below.'],
  ['p', 'We may also disclose information when required by law or when reasonably necessary to protect the rights, security, or safety of Canuckle, our players, or others.'],
  ['p', 'We do not sell or rent your personal information.'],

  ['h', '4. Do we use cookies and other technologies?'],
  ['p', 'We use cookies, local storage, and similar browser technologies to operate our Services, remember your preferences, maintain game functionality, provide advertising, and understand how our games are used.'],
  ['p', 'We use Yolla Media, LLC (“Yolla”) to provide and manage advertising on our website. Yolla and its advertising partners may use cookies and similar technologies to collect certain information about your use of our Services for advertising, analytics, and related purposes. To learn more about Yolla and its data practices, please visit yollamedia.com.', 'Advertising:'],
  ['p', 'Information related to your gameplay, such as puzzle progress, results, streaks, statistics, settings, and game history, may be stored locally in your browser or device and/or associated with your unique Canuckle User ID in our database. This allows Canuckle to maintain game functionality, progress, and statistics between visits and, where applicable, assist with game data recovery.'],
  ['p', 'You can control or delete cookies and locally stored information through your browser settings. Doing so may reset your Canuckle statistics, streaks, preferences, or game progress.'],

  ['h', '5. How long do we keep your information?'],
  ['p', 'We keep personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy or as required by law.'],
  ['p', 'Information stored locally in your browser generally remains there until it expires, is overwritten, or is deleted by you or your browser.'],
  ['p', 'Information associated with your Canuckle User ID may be retained as necessary to provide game functionality and recovery assistance.'],
  ['p', 'Aggregated or anonymized information that does not identify individual players may be retained for analytics and statistical purposes.'],

  ['h', '6. How do we keep your information safe?'],
  ['p', 'We use reasonable technical and organizational measures designed to protect information handled through our Services.'],
  ['p', 'However, no website, internet transmission, or electronic storage system can be guaranteed to be completely secure.'],

  ['h', '7. Do we collect information from children?'],
  ['p', 'Canuckle is a general-audience word game enjoyed by players of different ages. We do not require players to create an account or provide personal information in order to play.'],
  ['p', 'We do not knowingly solicit personal information from children. If you believe a child has provided personal information to us that should be removed, please contact us.'],

  ['h', '8. What are your privacy rights?'],
  ['p', 'Depending on where you live, you may have certain rights regarding personal information we hold about you, including the right to request access to, correction of, or deletion of that information.'],
  ['p', 'Because Canuckle does not require players to provide identifying information, we may not be able to identify or retrieve information associated with an individual player unless they have linked an email address or can provide their Canuckle User ID.'],
  ['p', 'You can manage or delete locally stored Canuckle information through your browser settings.'],
  ['p', 'If you have provided an email address for recovery purposes and have questions or requests regarding that information, please contact us.'],

  ['h', '9. Controls for Do-Not-Track features'],
  ['p', 'Some web browsers provide a “Do Not Track” (DNT) setting that allows you to signal a preference regarding online tracking.'],
  ['p', 'There is currently no universally accepted standard for responding to DNT signals, so our Services may not respond to all such signals. You can use your browser’s privacy settings to manage cookies, local storage, and similar technologies.'],

  ['h', '10. Do we make updates to this policy?'],
  ['p', 'Yes. We may update this Privacy Policy from time to time to reflect changes to our Services, technology, practices, or legal requirements.'],
  ['p', 'When we make changes, we will update the “Last updated” date at the top of this page. We encourage you to review this Privacy Policy periodically.'],

  ['h', '11. How can you contact us about this policy?'],
  ['p', 'If you have questions, concerns, or requests regarding this Privacy Policy or Canuckle’s privacy practices, please contact us at info@canucklegame.ca.'],
];

// Addresses in the text that become links.
const LINKS = [
  [/info@canucklegame\.ca/, 'mailto:info@canucklegame.ca'],
  [/yollamedia\.com/, 'https://yollamedia.com/'],
  [/canucklegame\.ca/, 'https://www.canucklegame.ca'],
];
const LINK_RE = /info@canucklegame\.ca|yollamedia\.com|canucklegame\.ca/g;

/** [text] as nodes, with the site, Yolla and email addresses linked. */
export function linkify(text) {
  const out = [];
  let at = 0;
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index > at) out.push(text.slice(at, m.index));
    const href = LINKS.find(([re]) => re.test(m[0]))[1];
    out.push(h('a', { href, target: href.startsWith('mailto:') ? null : '_blank', rel: 'noopener', text: m[0] }));
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

function policyBody() {
  const nodes = [];
  let list = null;
  for (const [kind, text, label] of POLICY) {
    if (kind === 'li') {
      if (!list) nodes.push((list = h('ul')));
      list.append(h('li', {}, ...linkify(text)));
      continue;
    }
    list = null;
    if (kind === 'h') nodes.push(h('h3', { text }));
    else nodes.push(h('p', {}, label ? h('strong', { text: label }) : null, label ? ' ' : null, ...linkify(text)));
  }
  return nodes;
}

/** Opens the policy in a sheet. [onBack] returns to wherever it came from. */
export function openPrivacy(onBack) {
  let close;
  const back = () => {
    close();
    if (onBack) onBack();
  };
  close = openSheet(h('div', {},
    sheetHead('Privacy Policy', back),
    h('article', { class: 'policy' },
      h('p', { class: 'muted policy-date', text: `Last updated: ${LAST_UPDATED}` }),
      ...policyBody())), { label: 'Privacy Policy', className: 'tall', scrollHint: true });
}
