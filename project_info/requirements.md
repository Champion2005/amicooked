# Requirements
## 1. User Authentication & Profile Integration
 - **GitHub Sign-In:** The system must allow users to log in securely using their existing GitHub credentials.
	 - Create new OAuth app with OAuth 2.0
	 - Redirect user to sign in page
	 - Store user client_id, client_secret, and code

 - **User Context Input:** The system needs a mechanism for users to input their current academic standing to establish a baseline for comparison. 
	 - From sign in page, go to setup page for user to enter extra information including Age, Education level, Area of Interest, Years of coding experience.
	 - save user information to database

## 2. Data Aggregation & Metrics
 - **Activity Tracking:** Retrieve commit history, pull requests, and code reviews for a certain amount of time.
	 - use GitHub GraphQL API (v4) to get activity for a certain time
 
 - **Repository Analysis:** Analyze repository data, specifically the number of repositories and languages used.
	 - Get repositories and the information from them

 - **Skill Profiling:** The tool needs to identify the user's primary programming languages (e.g., frontend vs. backend) to determine their current technical strengths and where they have room ofr improvement.
	 - Define categories and what goes in them: frontend, backend, etc
	 - Find percentage of each language used and rank 

## 3. AI-Powered Recommendations
 - **Benchmarking system:** Create and compare against an average baseline relevant to the users experience level with AI.

 - **Gap Identification:** The AI must identify gaps in the user's profile, such as a lack of backend skills if they primarily use frontend languages, or a low volume of repositories.

 - **Actionable Suggestions:** The system must generate specific, relevant tasks for the user, such as new project ideas or specific technologies to learn, to improve their standing.
