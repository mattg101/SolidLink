# Takopi Context (Concise)

## Directives and Context

- Supported directives at message start: `/engine`, `/project`, `@branch`.
- Directives must be a contiguous prefix; parsing stops at first non-directive token.
- At most one engine, one project, and one branch directive per message.
- If replying to a message with a backticked `ctx:` footer, Takopi ignores new directives and uses the reply context.

## ctx Footer

When project context is active, Takopi appends:

- `` `ctx: <project>` ``
- `` `ctx: <project> @<branch>` ``

Replying to that message continues in the same context.

## Projects

Register a repo:

```text
cd <repo>
takopi init <alias>
```

Use it from chat:

```text
/<alias> task text
```

## Worktrees

Use `@branch` to run in a dedicated worktree:

```text
/<alias> @feat/name task text
```

Config:

```toml
[projects.<alias>]
path = "~/dev/<repo>"
worktrees_dir = ".worktrees"
worktree_base = "main"
```

## Topics (Telegram forums)

Enable topics:

```toml
[transports.telegram.topics]
enabled = true
scope = "auto"
```

Topic commands (run inside a topic thread):

- `/topic <project> @branch` create and bind a topic
- `/ctx` show current binding
- `/ctx set <project> @branch` update binding
- `/ctx clear` remove binding
- `/new` clear stored session for the topic
