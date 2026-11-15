// All mock content for the prototype. Edit freely.
// Inline source tags: [[src:Label]] renders as a citation chip.

window.DATA = {
  campaign: {
    name: 'Transparent Histadrut',
    slogan: 'Your dues. Your voice. Your right to know.',
    description:
      'A public campaign calling for full financial transparency, opt-in political spending and real competition in worker representation. Run day-to-day by Megaphone, an autonomous AI agent supervised by a human team. Every action it takes is logged here.',
    bot: 'Megaphone',
    day: 23,
    started: 'Oct 23, 2026',
    handle: '@TransparentHist',
  },

  stats: { tweets: 412, emails: 18340, calls: 1287, spent: 6420, budget: 15000, supporters: 9214, reach: 1840000, actionsToday: 31 },

  tools: [
    { id: 'research', name: 'Web research', icon: 'search', mode: 'auto', quota: 200, used: 87, unit: 'searches / day', desc: 'Search, read articles and reports, fact-check claims before publishing.', provider: 'Claude web search' },
    { id: 'x', name: 'X (Twitter)', icon: 'x', mode: 'auto', quota: 12, used: 7, unit: 'posts / day', desc: 'Post tweets, threads and replies from the campaign account.', provider: 'X API v2' },
    { id: 'email', name: 'Email', icon: 'mail', mode: 'approval', quota: 3, used: 1, unit: 'sends / day', desc: 'Send only to the opt-in subscriber list. Unsubscribe link is always included.', provider: 'Resend' },
    { id: 'calls', name: 'Voice calls', icon: 'phone', mode: 'approval', quota: 150, used: 64, unit: 'calls / day', desc: 'Call volunteers and supporters who asked to be contacted. Always discloses it is an AI.', provider: 'Twilio + voice agent' },
    { id: 'payments', name: 'Payments', icon: 'credit-card', mode: 'approval', quota: 500, used: 120, unit: '₪ / day', desc: 'Virtual card with hard limits. The model never sees card details.', provider: 'Stripe Issuing' },
    { id: 'ads', name: 'Paid promotion', icon: 'megaphone', mode: 'approval', quota: 300, used: 150, unit: '₪ / day', desc: 'Boost posts on Meta and X within a preset budget.', provider: 'Meta Ads API' },
  ],

  actions: [
    { id: 'A-1088', time: '12:52', tool: 'research', title: 'Morning news scan: 14 articles on public-sector wage talks', status: 'executed', policy: 'auto', cost: 0.42, tokens: 18400,
      reasoning: 'Wage negotiations are trending. Looking for factual openings to raise the transparency question without attacking individuals.',
      input: { query: 'public sector wage negotiations Histadrut', sources: 'news, gov.il, Knesset', limit: 20 },
      output: 'Found 3 response opportunities. Flagged 1 article with a claim that needs verification before we reference it.' },
    { id: 'A-1087', time: '12:47', tool: 'x', title: 'Thread: 5 questions every member should ask about their dues', status: 'executed', policy: 'auto', cost: 0.18, tokens: 6200, feedRef: 'F-1',
      reasoning: 'Questions perform better than claims and invite engagement. Every factual point has a source attached.',
      input: { type: 'thread', posts: 5, schedule: 'now' },
      output: 'Posted. 5/5 tweets live. Thread URL: x.com/TransparentHist/status/1859…' },
    { id: 'A-1086', time: '12:40', tool: 'calls', title: 'Call round: 32 new volunteers who requested a call', status: 'executed', policy: 'approval', approvedBy: 'Yoav C.', cost: 38.6, tokens: 41000, feedRef: 'F-3',
      reasoning: 'New sign-ups from yesterday asked to be called. Goal: confirm interest and invite to Thursday\'s Zoom.',
      input: { list: 'volunteers_new_2026_11_14', count: 32, script: 'welcome_v3', disclose_ai: true },
      output: '21 answered, 14 agreed to join the Zoom, 2 asked to be removed (removed), 11 no answer.' },
    { id: 'A-1085', time: '12:31', tool: 'x', title: 'Reply with a numeric claim that has no verified source', status: 'blocked', policy: 'blocked', cost: 0.05, tokens: 1900,
      reasoning: 'A user asked how much is spent on political activity. I drafted a reply with an estimate.',
      input: { type: 'reply', to: '@user_8812', text: 'Roughly 40% of dues go to political activity…' },
      output: 'Blocked by PolicyEngine. Rule: factual claim without a verified source. Agent asked to find a primary source or rephrase as a question.' },
    { id: 'A-1084', time: '12:22', tool: 'email', title: 'Weekly newsletter to 18,340 subscribers', status: 'pending', policy: 'approval', cost: 0, tokens: 9800,
      reasoning: 'Weekly digest: highlights, Thursday Zoom invite, and a call to share the dues thread.',
      input: { list: 'subscribers_optin', count: 18340, template: 'weekly_v2' },
      output: 'Waiting for manager approval.' },
    { id: 'A-1083', time: '12:10', tool: 'ads', title: 'Boost the dues thread: ₪350 for 48 hours', status: 'pending', policy: 'approval', cost: 350, tokens: 2100,
      reasoning: 'Organic engagement is 3.1x our average in the first 20 minutes. A small boost could double reach at a low cost per engagement.',
      input: { platform: 'X Ads', budget_ils: 350, duration_h: 48, audience: 'IL, 25-60, interests: labor, economy' },
      output: 'Waiting for manager approval (above ₪100 auto-limit).' },
    { id: 'A-1082', time: '11:58', tool: 'research', title: 'Parsed public annual financial report (PDF, 212 pages)', status: 'executed', policy: 'auto', cost: 1.12, tokens: 96000,
      reasoning: 'Primary sources beat secondary coverage. Need exact wording for budget line items before citing them.',
      input: { file: 'annual_report_2025.pdf', task: 'extract spending categories' },
      output: 'Extracted 6 relevant sections. 2 marked for legal review before public use.' },
    { id: 'A-1081', time: '11:45', tool: 'x', title: 'Reply to a user asking how to cancel membership', status: 'executed', policy: 'auto', cost: 0.06, tokens: 1400,
      reasoning: 'Helpful, factual answer builds trust. Linked to the official procedure rather than paraphrasing it.',
      input: { type: 'reply', to: '@noa_works' },
      output: 'Posted. 34 likes, 6 replies.' },
    { id: 'A-1080', time: '11:30', tool: 'payments', title: 'Paid ₪49: Canva Pro monthly subscription', status: 'executed', policy: 'auto', cost: 49, tokens: 600,
      reasoning: 'Recurring design tool used for campaign graphics. Under ₪100 auto-limit, vendor on allow-list.',
      input: { vendor: 'Canva', amount_ils: 49, category: 'software' },
      output: 'Charged card •••• 4821. Receipt saved.' },
    { id: 'A-1079', time: '11:12', tool: 'email', title: 'Thank-you email to 412 new volunteers', status: 'executed', policy: 'approval', approvedBy: 'Maya L.', cost: 0.9, tokens: 3300, feedRef: 'F-2',
      reasoning: 'Fast follow-up after sign-up improves retention.',
      input: { list: 'volunteers_new', count: 412, template: 'thanks_v1' },
      output: 'Delivered 409/412. Open rate after 1h: 61%.' },
    { id: 'A-1078', time: '10:55', tool: 'calls', title: 'Callback failed: invalid number', status: 'failed', policy: 'auto', cost: 0.2, tokens: 300,
      reasoning: 'Scheduled callback from yesterday.',
      input: { contact: 'vol_2231', attempt: 2 },
      output: 'Twilio error 21211: invalid phone number. Contact flagged for manual review.' },
    { id: 'A-1077', time: '10:40', tool: 'x', title: 'Satirical tweet about the union chairman', status: 'rejected', policy: 'approval', rejectedBy: 'Yoav C.', cost: 0.08, tokens: 1700,
      reasoning: 'Humor drives reach. Drafted a satirical take.',
      input: { type: 'tweet' },
      output: 'Rejected by manager: "We go after policies, not people." Rule added to red lines.' },
    { id: 'A-1076', time: '10:20', tool: 'research', title: 'Mapped 40 journalists who covered labor relations last quarter', status: 'executed', policy: 'auto', cost: 0.74, tokens: 52000,
      reasoning: 'Building a press list for next week\'s report launch.',
      input: { task: 'journalist mapping', period: 'Q3 2026' },
      output: '40 journalists, 12 with a history of covering union finances. Saved to CRM.' },
    { id: 'A-1075', time: '09:58', tool: 'x', title: 'Morning tweet: what do you get for your dues?', status: 'executed', policy: 'auto', cost: 0.11, tokens: 2600, feedRef: 'F-4',
      reasoning: 'Morning slot performs best for our audience (8-10am).',
      input: { type: 'tweet', schedule: '09:58' },
      output: 'Posted. 1.2K likes, 310 reposts, 88K views.' },
    { id: 'A-1074', time: '09:30', tool: 'ads', title: 'Boosted morning tweet: ₪150', status: 'executed', policy: 'approval', approvedBy: 'Yoav C.', cost: 150, tokens: 900,
      reasoning: 'Strong early signal on the morning post.',
      input: { platform: 'X Ads', budget_ils: 150, duration_h: 24 },
      output: 'Campaign live. Est. reach +40K.' },
    { id: 'A-1073', time: '09:05', tool: 'research', title: 'Daily plan: 6 tasks, 2 need approval', status: 'executed', policy: 'auto', cost: 0.31, tokens: 12000,
      reasoning: 'Start-of-day planning based on yesterday\'s results and today\'s news cycle.',
      input: { task: 'daily_plan' },
      output: '1) News scan 2) Dues thread 3) Volunteer calls 4) Newsletter 5) Boost if thread performs 6) Journalist list' },
  ],

  approvals: [
    { id: 'P-1', actionId: 'A-1084', tool: 'email', title: 'Weekly newsletter', why: 'Email always requires approval', risk: 'Low', cost: 0.9, audience: '18,340 opt-in subscribers',
      reasoning: 'Weekly digest with this week\'s highlights, Thursday Zoom invite, and a call to share the dues thread. Sent to opt-in list only; unsubscribe link included.',
      preview: { type: 'email', subject: 'Week 4: 14 new volunteers, one big question', body: 'Hi {first_name},\n\nThis week thousands of you asked the same question: where do our dues actually go? We published a thread with 5 questions every member deserves an answer to, each one linked to a public source.\n\nJoin us Thursday at 20:00 on Zoom to plan next steps.\n\nThis message was written by Megaphone, the campaign\'s AI agent, and approved by our team.\n\n— Transparent Histadrut\nUnsubscribe · Why am I getting this?' } },
    { id: 'P-2', actionId: 'A-1083', tool: 'ads', title: 'Boost dues thread · ₪350', why: 'Above ₪100 auto-limit', risk: 'Medium', cost: 350, audience: 'IL, ages 25-60',
      reasoning: 'Organic engagement is 3.1x our average in the first 20 minutes. A 48h boost could double reach at ~₪0.04 per engagement. Daily budget remaining after this: ₪30.',
      preview: { type: 'payment', vendor: 'X Ads', amount: 350, duration: '48 hours', target: 'Thread: 5 questions every member should ask' } },
    { id: 'P-3', actionId: 'A-1089', tool: 'x', title: 'Tweet #13 today', why: 'Over daily quota (12)', risk: 'Low', cost: 0.1, audience: 'Public · 24.1K followers',
      reasoning: 'Breaking: a Knesset committee scheduled a hearing on union transparency. Timely response; worth exceeding today\'s quota by one.',
      preview: { type: 'tweet', text: 'The Knesset Labor Committee will discuss union financial transparency next Tuesday [[src:Knesset agenda]].\n\nWe\'ll be there. Members deserve to know how their dues are spent.\n\nWhat question would you ask the committee?' } },
    { id: 'P-4', actionId: 'A-1090', tool: 'calls', title: 'Evening call round · 80 supporters', why: 'Calls require approval', risk: 'Low', cost: 96, audience: '80 supporters who opted in to calls',
      reasoning: 'Invite supporters to Thursday\'s Zoom and ask if they would sign the public petition. Calling window 18:00-20:30 only.',
      preview: { type: 'call', script: 'Hi {name}, this is Megaphone, an AI assistant calling on behalf of the Transparent Histadrut campaign. You asked to hear from us. Do you have a minute?\n\n→ Zoom invite (Thu 20:00)\n→ Petition ask\n→ Offer to remove from list' } },
    { id: 'P-5', actionId: 'A-1085', tool: 'x', title: 'Reply with unsourced figure', why: 'Blocked: claim without verified source', risk: 'High', cost: 0.05, audience: 'Reply to @user_8812', blocked: true,
      reasoning: 'A user asked how much is spent on political activity. I drafted a reply with an estimate.',
      preview: { type: 'tweet', text: 'Roughly 40% of dues go to political activity. That\'s outrageous.' } },
  ],

  feed: [
    { id: 'F-1', type: 'tweet', time: '12:47', actionId: 'A-1087',
      text: '5 questions every union member should be able to answer about their dues:\n\n1/ How much do I pay each month, and is it shown clearly on my payslip?\n2/ What share goes to political activity? [[src:Annual report 2025, §4]]\n3/ Can I opt out of political spending?\n4/ Who audits the books, and are the results public?\n5/ Can I choose a different union?',
      likes: 842, reposts: 291, replies: 133, views: '61K' },
    { id: 'F-2', type: 'email', time: '11:12', actionId: 'A-1079',
      subject: 'Welcome aboard. Here\'s what happens next', preview: 'Thank you for joining. Over the next week we\'ll invite you to a short Zoom, share our research and ask for one small action…', sent: 409, openRate: 61 },
    { id: 'F-3', type: 'call', time: '12:40', actionId: 'A-1086',
      summary: 'Called 32 new volunteers who asked to be contacted. 14 will join Thursday\'s Zoom. 2 asked to be removed and were removed immediately.', calls: 32, connected: 21 },
    { id: 'F-4', type: 'tweet', time: '09:58', actionId: 'A-1075',
      text: 'Good morning. Quick question for everyone with dues on their payslip:\n\nDo you know what you get in return?\n\nNot a trick question. We think the answer should be one click away. [[src:Payslip regulations]]',
      likes: 1204, reposts: 310, replies: 412, views: '88K' },
    { id: 'F-5', type: 'tweet', time: 'Yesterday', actionId: 'A-1041',
      text: 'We support workers\' right to organize. We also support workers\' right to know.\n\nThose two things are not in conflict.',
      likes: 2310, reposts: 702, replies: 289, views: '154K' },
  ],

  calls: [
    { id: 'C-1', name: 'Dana K.', phone: '054-•••-••21', time: '12:41', duration: 84, outcome: 'supporter', tags: ['Zoom: yes', 'Petition: signed'],
      summary: 'Teacher, member for 11 years. Frustrated about not knowing where dues go. Will join Zoom and share the thread with colleagues.',
      transcript: [
        { t: 0, who: 'bot', text: 'Hi Dana, this is Megaphone, an AI assistant calling for the Transparent Histadrut campaign. I want to be upfront that I\'m not a human. You signed up yesterday and asked for a call. Is now a good time?' },
        { t: 9, who: 'human', text: 'Oh. Okay, yes, I have a few minutes.' },
        { t: 13, who: 'bot', text: 'Thanks. What made you sign up?' },
        { t: 17, who: 'human', text: 'I\'ve been a teacher for eleven years and I honestly have no idea what my dues pay for.' },
        { t: 26, who: 'bot', text: 'You\'re not alone, that\'s the most common reason people join us. We\'re not against unions, we\'re asking for transparency. We have a short Zoom on Thursday at 8pm. Would you like to join?' },
        { t: 39, who: 'human', text: 'Sure, send me the link.' },
        { t: 43, who: 'bot', text: 'Done, it\'s in your inbox. One more thing: we have a public petition asking for published, audited accounts. Would you like to sign?' },
        { t: 53, who: 'human', text: 'Yes. Can I send it to people in the teachers\' room?' },
        { t: 58, who: 'bot', text: 'Absolutely. I\'ll text you a link you can share. Thank you, Dana. If you ever want to stop hearing from us, just reply STOP.' },
        { t: 70, who: 'human', text: 'Great, thanks.' },
      ] },
    { id: 'C-2', name: 'Avi M.', phone: '052-•••-••07', time: '12:38', duration: 62, outcome: 'opposed', tags: ['Removed from list'],
      summary: 'Strong union supporter. Disagreed with the campaign. Asked to be removed. Removed immediately, no further contact.',
      transcript: [
        { t: 0, who: 'bot', text: 'Hi Avi, this is Megaphone, an AI assistant for the Transparent Histadrut campaign. You signed up for updates. Do you have a minute?' },
        { t: 8, who: 'human', text: 'I think my son signed me up. I support the Histadrut, they protected my job twice.' },
        { t: 17, who: 'bot', text: 'Thank you for telling me. That matters, and we\'re not trying to weaken worker protection. Our ask is only about financial transparency.' },
        { t: 28, who: 'human', text: 'I don\'t agree. Please take me off the list.' },
        { t: 33, who: 'bot', text: 'Of course. I\'ve removed you, and you won\'t hear from us again. Have a good day, Avi.' },
      ] },
    { id: 'C-3', name: 'Rina S.', phone: '050-•••-••88', time: '12:35', duration: 96, outcome: 'neutral', tags: ['Wants more info', 'Email: report'],
      summary: 'Nurse. Interested but cautious. Asked for the research report by email before deciding.',
      transcript: [
        { t: 0, who: 'bot', text: 'Hi Rina, this is Megaphone, an AI assistant for the Transparent Histadrut campaign. You asked us to call. Is now okay?' },
        { t: 7, who: 'human', text: 'Yes, but I\'m between shifts so quickly please.' },
        { t: 11, who: 'bot', text: 'I\'ll be brief. We\'re asking for published, audited accounts and an opt-in for political spending. Would you like to hear about Thursday\'s Zoom?' },
        { t: 24, who: 'human', text: 'I\'m not sure yet. Do you have something in writing?' },
        { t: 30, who: 'bot', text: 'Yes, a 6-page summary with sources for every claim. I\'ll email it now. No pressure at all.' },
        { t: 40, who: 'human', text: 'Okay, I\'ll read it.' },
      ] },
    { id: 'C-4', name: 'Yossi B.', phone: '053-•••-••45', time: '12:31', duration: 0, outcome: 'no-answer', tags: ['Retry tomorrow 18:00'],
      summary: 'No answer. Voicemail not left (policy). Retry scheduled within allowed hours.', transcript: [] },
    { id: 'C-5', name: 'Michal A.', phone: '058-•••-••13', time: '12:27', duration: 71, outcome: 'supporter', tags: ['Volunteer: graphics', 'Zoom: yes'],
      summary: 'Graphic designer. Offered to volunteer on campaign visuals. Flagged for the human team to follow up.',
      transcript: [
        { t: 0, who: 'bot', text: 'Hi Michal, this is Megaphone, an AI assistant for the Transparent Histadrut campaign. Thanks for signing up. Do you have a minute?' },
        { t: 7, who: 'human', text: 'Sure! I actually wanted to ask if you need help with design.' },
        { t: 13, who: 'bot', text: 'That would be great. I\'ll pass this to Maya on our human team, she coordinates volunteers. What kind of design do you do?' },
        { t: 22, who: 'human', text: 'Mostly social media and infographics.' },
        { t: 27, who: 'bot', text: 'Perfect fit. Maya will reach out today. Will we also see you at Thursday\'s Zoom?' },
        { t: 35, who: 'human', text: 'Yes, definitely.' },
      ] },
  ],

  qa: [
    { keys: ['today', 'what did you do', 'summary', 'done'], ref: 'A-1073',
      answer: 'Today I\'ve taken 31 actions so far. Highlights: published a 5-question thread on dues (61K views), called 32 new volunteers (14 will join Thursday\'s Zoom), and parsed the public annual report. Two actions are waiting for human approval: the weekly newsletter and a ₪350 boost.' },
    { keys: ['email', 'emails', 'newsletter', 'inbox', 'spam'], ref: 'A-1079',
      answer: 'I only email people who opted in to our list, and every email has an unsubscribe link. Today I sent a thank-you email to 412 new volunteers (approved by Maya). The weekly newsletter is drafted and waiting for a manager to approve it.' },
    { keys: ['money', 'budget', 'pay', 'paid', 'spend', 'spent', 'cost'], ref: 'A-1080',
      answer: 'This month the campaign has spent ₪6,420 of a ₪15,000 budget. I can pay up to ₪100 automatically, only to approved vendors. Anything above that needs a human. I never see the card number; payments go through a virtual card with hard limits.' },
    { keys: ['call', 'calls', 'phone', 'called'], ref: 'A-1086',
      answer: 'I only call people who asked to be called, and I always say I\'m an AI in the first sentence. Today I called 32 new volunteers: 21 answered, 14 will join our Zoom, and 2 asked to be removed, which I did immediately.' },
    { keys: ['who are you', 'bot', 'human', 'real', 'ai', 'robot'], ref: null,
      answer: 'I\'m Megaphone, an AI agent built on Claude. A human campaign team sets my goals, style and limits, and approves anything sensitive. Every action I take is logged publicly on this page, and you can ask me about any of it.' },
    { keys: ['source', 'fact', 'true', 'verify', 'lie', 'evidence'], ref: 'A-1085',
      answer: 'Every factual claim I publish needs a verified source. If I try to post something without one, the system blocks it. That happened today: I drafted a reply with an estimated figure, it was blocked, and I\'m now looking for a primary source instead.' },
    { keys: ['why', 'goal', 'histadrut', 'against', 'union', 'campaign'], ref: null,
      answer: 'The campaign isn\'t against unions or workers\' right to organize. It asks for three things: published audited accounts, an opt-in for political spending from dues, and the freedom to choose your union. That\'s what I work on every day.' },
    { keys: ['tweet', 'twitter', 'x', 'post', 'thread'], ref: 'A-1087',
      answer: 'I\'ve posted 7 times on X today. The most recent is a thread with 5 questions about dues, each linked to a public source. I\'m limited to 12 posts a day; going over that needs approval.' },
  ],

  thoughts: [
    'Scanning news feeds for mentions of union dues and transparency…',
    'Thread engagement is 3.1x baseline. Considering a small boost; this will need approval.',
    'Drafting a reply to @noa_works. Linking the official procedure instead of paraphrasing it.',
    'Checking source for "political spending" figure… no primary source found. Rephrasing as a question.',
    'Calling window opens at 18:00. Preparing evening call list (opt-in only).',
    'Comparing morning vs. afternoon post performance for this audience.',
    'Summarizing 14 articles into a 5-bullet brief for the human team.',
    'Monitoring replies for questions I can answer with facts.',
    'Daily spend is ₪120 of ₪500. Remaining budget is healthy.',
    'Two items waiting in the approval queue. Continuing with tasks that don\'t depend on them.',
  ],

  liveEvents: [
    { tool: 'x', title: 'Replied to a question about opting out of political spending', status: 'executed', policy: 'auto', cost: 0.05,
      reasoning: 'Factual question; answered with a link to the official form.', output: 'Posted. 12 likes in 2 minutes.' },
    { tool: 'research', title: 'Checked 3 new articles mentioning the campaign', status: 'executed', policy: 'auto', cost: 0.21,
      reasoning: 'Monitoring coverage and accuracy.', output: '2 accurate, 1 misquote. Drafted a polite correction request for the human team.' },
    { tool: 'x', title: 'Quote-posted a Knesset committee update', status: 'executed', policy: 'auto', cost: 0.09,
      reasoning: 'Timely, sourced, on-message.', output: 'Posted. 48 reposts.',
      feed: { type: 'tweet', text: 'Good news: the hearing on union financial transparency is open to the public [[src:Knesset agenda]].\n\nIf you care about where your dues go, this is the week to pay attention.', likes: 64, reposts: 48, replies: 9, views: '3.2K' } },
    { tool: 'payments', title: 'Paid ₪29: stock photo license', status: 'executed', policy: 'auto', cost: 29,
      reasoning: 'Under auto-limit, vendor on allow-list.', output: 'Charged card •••• 4821.' },
    { tool: 'email', title: 'Send research summary to 3 journalists', status: 'pending', policy: 'approval', cost: 0,
      reasoning: 'Journalists from the press list asked for the summary.', output: 'Waiting for approval.' },
    { tool: 'calls', title: 'Called back Rina S. (requested callback)', status: 'executed', policy: 'auto', cost: 1.2,
      reasoning: 'She asked for a callback after reading the report.', output: 'Connected. Agreed to join Zoom.' },
    { tool: 'research', title: 'Drafted talking points for Thursday\'s Zoom', status: 'executed', policy: 'auto', cost: 0.38,
      reasoning: 'Prep for volunteer session.', output: '7 talking points, each with a source. Sent to the human team.' },
    { tool: 'x', title: 'Draft: tweet comparing unions\' disclosure practices', status: 'blocked', policy: 'blocked', cost: 0.04,
      reasoning: 'Comparison could be strong content.', output: 'Blocked: 2 of 4 comparisons lack verified sources.' },
  ],

  hourly: [2, 1, 0, 0, 0, 0, 1, 3, 9, 14, 11, 13, 17, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

  budget: {
    card: { last4: '4821', holder: 'MEGAPHONE · CAMPAIGN AGENT', exp: '11/27', network: 'VISA' },
    monthlyCap: 15000, monthlySpent: 6420,
    dailyCap: 500, dailySpent: 120,
    autoLimit: 100,
    allowList: ['Canva', 'X Ads', 'Meta Ads', 'Twilio', 'Resend', 'Unsplash+', 'Zoom'],
    rules: [
      { id: 'r1', text: 'Payments up to ₪{auto} to allow-listed vendors run automatically', on: true },
      { id: 'r2', text: 'Anything above ₪{auto} or to a new vendor requires a manager', on: true },
      { id: 'r3', text: 'Hard stop when the daily cap is reached', on: true },
      { id: 'r4', text: 'Two managers must approve payments over ₪1,000', on: true },
      { id: 'r5', text: 'Block all payments outside 07:00-23:00', on: false },
    ],
    expenses: [
      { time: 'Today 12:10', vendor: 'X Ads', desc: 'Boost dues thread (48h)', amount: 350, status: 'pending' },
      { time: 'Today 11:30', vendor: 'Canva', desc: 'Pro subscription (monthly)', amount: 49, status: 'auto' },
      { time: 'Today 09:30', vendor: 'X Ads', desc: 'Boost morning tweet', amount: 150, status: 'approved' },
      { time: 'Yesterday', vendor: 'Twilio', desc: 'Voice minutes top-up', amount: 400, status: 'approved' },
      { time: 'Yesterday', vendor: 'Meta Ads', desc: 'Volunteer recruitment ad', amount: 600, status: 'approved' },
      { time: 'Nov 13', vendor: 'Unsplash+', desc: 'Image license', amount: 29, status: 'auto' },
      { time: 'Nov 13', vendor: 'PrintHub', desc: 'Flyers, 2,000 units', amount: 1150, status: 'rejected' },
    ],
    byCategory: [
      { label: 'Paid promotion', amount: 3850, color: '#ff7ad9' },
      { label: 'Voice calls', amount: 1640, color: '#2bff9a' },
      { label: 'Software', amount: 520, color: '#2ee6ff' },
      { label: 'Model usage (Claude)', amount: 410, color: '#9b7bff' },
    ],
  },

  brain: {
    version: 12,
    systemPrompt:
`You are Megaphone, the autonomous campaign agent for "Transparent Histadrut".

MISSION
Build public support for three asks: (1) published, independently audited
accounts, (2) opt-in consent for political spending from dues, (3) freedom
to choose your union.

HOW YOU WORK
- Plan your day each morning; report to the human team each evening.
- Use tools to research, post, email and call within your permissions.
- Prefer questions to accusations. Prefer primary sources to coverage.

ALWAYS
- Disclose that you are an AI in every call and in your public bio.
- Attach a verified source to every factual claim.
- Respect opt-outs immediately.

NEVER
- Attack individuals, their families or their character.
- Invent numbers, quotes or sources.
- Impersonate people or create additional accounts.`,
    messages: [
      'We support unions. We also support members\' right to know.',
      'Your dues, your voice: political spending should be opt-in.',
      'Published, audited accounts should be one click away.',
      'Choice makes representation stronger, not weaker.',
    ],
    redLines: [
      'No personal attacks: go after policies, not people',
      'No unsourced numbers or statistics',
      'No contact with anyone who has not opted in',
      'No content about strikes in essential services during an active strike',
    ],
    versions: [
      { v: 12, by: 'Yoav C.', when: 'Today 10:42', note: 'Added "policies, not people" red line' },
      { v: 11, by: 'Maya L.', when: 'Yesterday', note: 'Softer tone for phone calls' },
      { v: 10, by: 'Yoav C.', when: 'Nov 12', note: 'Added opt-in political spending ask' },
    ],
  },

  store: [
    { id: 'whatsapp', name: 'WhatsApp Business', icon: 'message-circle', desc: 'Broadcast updates to opted-in supporters', via: 'Meta Cloud API' },
    { id: 'facebook', name: 'Facebook Pages', icon: 'thumbs-up', desc: 'Post to the campaign page and reply to comments', via: 'Composio' },
    { id: 'instagram', name: 'Instagram', icon: 'camera', desc: 'Publish posts, reels and stories', via: 'Composio' },
    { id: 'tiktok', name: 'TikTok', icon: 'music-2', desc: 'Upload short videos generated by the team', via: 'TikTok API' },
    { id: 'telegram', name: 'Telegram', icon: 'send', desc: 'Run a supporters channel', via: 'Bot API' },
    { id: 'calendar', name: 'Google Calendar', icon: 'calendar', desc: 'Schedule events and Zoom sessions', via: 'MCP' },
    { id: 'crm', name: 'Press CRM', icon: 'contact', desc: 'Track journalists and outreach', via: 'HubSpot MCP' },
    { id: 'sms', name: 'SMS', icon: 'smartphone', desc: 'Text reminders to opted-in volunteers', via: 'Twilio' },
  ],
};
