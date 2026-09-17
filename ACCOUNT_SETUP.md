# 🪜 Account Setup — Google → GitHub → Render → Supabase → Meta (click-by-click)

Do these IN ORDER. Each account unlocks the next. All free. At every step there is
a **copy-paste prompt** you can send to your other AI helper if you want live
hand-holding while tapping through screens.

> ⏭️ Already have one of these? Skip that step — just make sure you can LOG IN.
> 🔑 Rule for all steps: **write every password down** on paper or in your notes app.
> Railway: NOT needed — skip it entirely. Nothing to recover, nothing to pay.

---

## Step 1 — Google account (your master key) 🔑
Everything else (GitHub, Render, Supabase) can "Sign up with Google/GitHub", and
this Gmail receives all verification codes. ~10 mins.

1. Open **Chrome** (or any browser) on your phone → go to **accounts.google.com/signup**
2. First name: your real first name · Last name: your real last name
   (Safer for account recovery than a business name. The *email* carries the brand.)
3. Tap **Next** → choose your email: type `theparagonhub`
   → if taken, try `theparagonhub27`, `paragonhubkogi`, etc. → **Next**
4. Create a strong password (mix letters + numbers, 8+ characters) → **write it down** → **Next**
5. Add your phone number → **Next** → enter the **SMS code** Google sends you
6. Fill birthday + gender → **Next**
7. Google may offer "Add phone for security / Express personalization" → accept the defaults (fine) → **Next**
8. Tap **I agree** → DONE. You now own `theparagonhub@gmail.com` (or whichever you picked).

⚠️ On the "Create account" screen Google may offer *"For work or my business"* —
do NOT pick that (it pushes a paid Workspace trial). Pick **"For personal use"**
— it's still a normal free Gmail you can use for business.

📩 **Send me back:** the new Gmail address (just the address, NEVER the password).

> 🤖 **Prompt for your other AI (copy-paste):**
> "I'm creating a new free Google/Gmail account on my phone for my business.
> Walk me through every screen one at a time and tell me exactly what to tap or
> type. My name is [YOUR NAME], I want the email theparagonhub@gmail.com (or close).
> If I get stuck I'll describe the screen to you — keep answers short."

---

## Step 2 — GitHub account (where the bot code lives) 💻
Free forever. You will only ever use the Upload button — no coding. ~10 mins.

1. In your browser go to **github.com/signup**
2. Email: paste your **new Gmail** → **Continue**
3. Password: create one (different from Gmail ideally) → **write it down** → **Continue**
4. Username: try `theparagonhub` (if taken: `paragonhub`, `paragon-hub`, `paragonhub27`…)
   → this name is PUBLIC, so keep it brand-clean → **Continue**
5. Type `y` when it asks "Receive product updates?" (optional either way) → **Continue**
6. Solve the little puzzle (drag/click to prove you're human) → **Create account**
7. GitHub emails you a **launch code** → open Gmail → enter the code → verified ✅
8. It asks about your team/interests → pick anything / skip → choose the **Free** plan → **Continue for free**

📩 **Send me back:** your GitHub username (e.g. `theparagonhub`).

> 🤖 **Prompt for your other AI (copy-paste):**
> "I'm signing up for a free GitHub account on my phone. My email is [GMAIL].
> Walk me through each screen one screen at a time — tell me exactly what to tap
> or type. I only need the FREE plan. Keep answers short."

---

## Step 3 — Render account (free bot hosting, via GitHub) 🖥️
~5 mins. (Deploying the bot itself comes later in `LAUNCH.md` Step 2 — this is just the account.)

1. Go to **render.com** → tap **Get Started** (or Sign Up)
2. Tap **Sign up with GitHub** → tap **Authorize Render** (this links the accounts — safe)
3. Fill name/email if asked → choose the **free Hobby ($0)** workspace → continue
4. You land on the Render **Dashboard** ✅ (empty is normal — we deploy later)

💳 If Render ever asks for a card: free services are NOT charged — it's only an
anti-abuse check. Skip it if you can; if it's mandatory and you have a card, adding
it is safe (stays $0). No card + mandatory = tell me, we'll look at options.

📩 **Send me back:** "Render done" (+ the email shown on the dashboard, so I can match it later).

> 🤖 **Prompt for your other AI (copy-paste):**
> "I'm creating a free Render account by signing up with my GitHub account
> (username [___]). Walk me through each screen — I must stay on the FREE $0
> plan and I don't want to be charged. Tell me exactly what to tap. Keep answers short."

---

## Step 4 — Supabase account (free cloud backup, via GitHub) 🗄️
~15 mins. This is what keeps your orders safe when Render restarts.

1. Go to **supabase.com** → tap **Start your project** (or Sign In)
2. Tap **Continue with GitHub** → **Authorize Supabase** → you land on the dashboard ✅
3. Tap **New project** → Name: `paragon` → Database Password: tap **Generate** (copy + SAVE it somewhere) → Region: leave the default → Plan: **Free** → **Create new project**
4. Wait ~2 minutes while it builds (☕)
5. Left menu → **SQL Editor** → **New query** → paste this and tap **Run**:
   ```sql
   create table if not exists kv (key text primary key, value jsonb, updated_at timestamptz default now());
   ```
   You should see "Success. No rows returned" ✅
6. Left menu → **Project Settings** (⚙️) → **API** → copy TWO secrets:
   - **Project URL** (looks like `https://xyzcompany.supabase.co`)
   - **service_role** key (long secret — tap Reveal, copy it. NEVER share publicly — only with me, privately.)

📩 **Send me back:** Project URL + service_role key (paste both to ME directly).

> 🤖 **Prompt for your other AI (copy-paste):**
> "I'm setting up a free Supabase project on my phone. I signed in with GitHub.
> Guide me one screen at a time: create a project named 'paragon' on the FREE plan,
> then open SQL Editor and run a query I'll paste, then find Project Settings → API
> to copy the Project URL and service_role key. Tell me exactly what to tap. Keep answers short."

---

## Step 5 — Meta developer + WhatsApp sandbox (free test line) 📱
~30–60 mins. You already have Facebook ✅ so you're unblocked. (Connecting it to
the bot happens after deploy — `LAUNCH.md` Steps 3–4. This step just prepares Meta.)

1. Go to **developers.facebook.com** → **Get Started** → **Continue with Facebook** (log in)
2. Verify (email/phone) if asked → you enter the **App Dashboard** ✅
3. **Create App** → choose **Other** → type **Business** → App name: `Paragon Hub Bot`
   → Business Portfolio: create/select yours → **Create app** (enter Facebook password if asked)
4. In the left menu find **Add Product** → find **WhatsApp** → **Set up**
   → this creates your test account with a **sandbox phone number** 🎉
5. On the **API Setup** page, under "Send and receive messages":
   - **Step 1:** copy the temporary **Access Token** + **Phone Number ID** (send both to me)
   - **Step 5 ("Send messages"):** add YOUR personal number → **verify the OTP** Meta sends you
6. From your phone, message the sandbox number `Hi` (it won't reply yet — the bot connects later — but messaging it proves your number is registered ✅)

📩 **Send me back:** temporary Access Token + Phone Number ID + "my number is registered".

> 🤖 **Prompt for your other AI (copy-paste):**
> "I'm setting up WhatsApp API testing on developers.facebook.com. I logged in with
> Facebook. Guide me one screen at a time: create an app (Other → Business) named
> 'Paragon Hub Bot', add the WhatsApp product, then on API Setup copy the temporary
> token and Phone Number ID, and add my personal number [YOUR NUMBER] as a test
> recipient. Tell me exactly what to tap. Keep answers short."

---

## After all 5: the deploy chain (me + you, ~1 hr)
Accounts done → we do `LAUNCH.md` Steps 1–6 together: upload code to GitHub →
Render deploy → paste secrets → connect Meta webhook → full test script → bot ALIVE. 🎉

**Checklist — reply with your progress like this:**
- [ ] Step 1: Gmail = ________
- [ ] Step 2: GitHub username = ________
- [ ] Step 3: Render done
- [ ] Step 4: Supabase URL + key sent
- [ ] Step 5: Meta token + Phone ID sent, number registered
