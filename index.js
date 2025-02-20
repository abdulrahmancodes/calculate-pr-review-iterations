import { config } from "dotenv";
import { Octokit } from "@octokit/rest";
import dayjs from "dayjs";
config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const START_DATE = "01-01-2025"; // MM-DD-YYYY
const END_DATE = dayjs().format("MM-DD-YYYY");
const PR_AUTHOR = "abdulrahmancodes";

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

async function fetchPRs() {
  let prs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await octokit.rest.pulls.list({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: "all",
      sort: "created",
      direction: "desc",
      per_page: 100,
      page: page,
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch PRs: ${response.statusText}`);
    }

    const filteredPRs = response.data.filter((pr) => {
      const createdAt = dayjs(pr.created_at);
      const startDate = dayjs(START_DATE);
      const endDate = dayjs(END_DATE);
      return (
        createdAt.isAfter(startDate) &&
        createdAt.isBefore(endDate) &&
        pr.user.login === PR_AUTHOR
      );
    });

    prs = prs.concat(filteredPRs);

    if (response.data.length < 100) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log("Total PRs fetched:", prs.length);

  return prs;
}

async function fetchReviews(prNumber) {
  const response = await octokit.rest.pulls.listReviews({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: prNumber,
  });

  if (response.status !== 200) {
    throw new Error(
      `Failed to fetch reviews for PR #${prNumber}: ${response.statusText}`
    );
  }

  return response.data;
}

async function calculateAverageIterations() {
  try {
    const prs = await fetchPRs();
    let totalIterations = 0;

    for (const pr of prs) {
      const reviews = await fetchReviews(pr.number);
      const changesRequestedCount = reviews.filter(
        (review) => review.state === "CHANGES_REQUESTED"
      ).length;

      console.log(`PR #${pr.number}: ${changesRequestedCount} iterations`);

      totalIterations += changesRequestedCount;
    }

    const averageIterations = totalIterations / prs.length;
    console.log(`Total PRs: ${prs.length}`);
    console.log(`Total iterations: ${totalIterations}`);
    console.log(`Average iterations per PR: ${averageIterations.toFixed(2)}`);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

calculateAverageIterations();
