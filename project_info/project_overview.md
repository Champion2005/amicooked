## Project Overview: amicooked

**amicooked** is an AI-powered GitHub portfolio auditor designed to give developers a brutally honest reality check on their employability. By analyzing granular account data, the platform determines if a user’s career prospects are "cooked" and provides a personalized roadmap to recovery.

### The Core Concept

Users sign in via GitHub, allowing the application to scrape and analyze their development history. The system compares their metrics against industry averages relative to their education level or career stage (e.g., Sophomore vs. Senior vs. Junior Dev) to generate a proprietary **"Cooked Level."** (This can be done using generative AI for sake of time)

### How It Works

**1. Data Ingestion**
The system aggregates key performance indicators from the user's GitHub profile, including:

* **Volume & Consistency:** Repository count, commit history, and activity streaks.
* **Engagement:** Pull requests, code reviews, and issue tracking.
* **Community Impact:** Stars, forks, and contribution graphs.
* **Tech Stack:** Language distribution (e.g., Frontend vs. Backend balance).

**2. The "Cooked Level" Algorithm**
Using this data, the system calculates a score that represents the user's current standing in the job market.

* **9-10:** "Cooking" / Ahead of the curve.
* **7-8:** "Toasted" / Slightly behind.
* **5-6:** "Cooked" / Concerning gaps.
* **3-4:** "Well-Done" / Significant issues.
* **1-2:** "Burnt" / Unemployable without major changes.

**3. AI Summary & Employability Check**
A generative AI model digests the data to provide a concise, qualitative summary. It highlights critical gaps—such as a lack of collaborative projects (0 PRs) or being "one-dimensional" (100% HTML/CSS)—and offers a clear verdict on whether the user is ready for recruiters.

**4. The Recovery Roadmap**
Instead of just identifying the problem, **amicooked** generates actionable, context-aware suggestions to lower the "Cooked Level":

* *Scenario:* User has high repo count but low complexity. -> *Suggestion:* "Build a full-stack CRUD app to demonstrate depth."
* *Scenario:* User is backend-heavy. -> *Suggestion:* "Contribute to a frontend library to show versatility."

### Value Proposition

**amicooked** gamifies career preparation, turning anxiety-inducing portfolio reviews into an actionable, data-driven checklist for success.