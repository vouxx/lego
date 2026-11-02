import { octokit, REPO } from "./github";

/** 이슈/PR 댓글의 슬래시 명령 처리: /label bug, /close, /assign @someone */
export async function runCommand(issueNumber: number, comment: string) {
  const [cmd, ...args] = comment.trim().split(/\s+/);

  switch (cmd) {
    case "/label":
      await octokit.issues.addLabels({ ...REPO, issue_number: issueNumber, labels: args });
      break;
    case "/close":
      await octokit.issues.update({ ...REPO, issue_number: issueNumber, state: "closed" });
      break;
    case "/assign":
      await octokit.issues.addAssignees({
        ...REPO,
        issue_number: issueNumber,
        assignees: args.map((a) => a.replace(/^@/, "")),
      });
      break;
    case "/merge":
      await octokit.pulls.merge({ ...REPO, pull_number: issueNumber, merge_method: "squash" });
      break;
  }
}
