# Smart Grouping Tabs

This project forked from [AutoGroupTabs](https://github.com/abevol/AutoGroupTabs) by [abevol](https://github.com/abevol).

Simple and easy to use extension for automatically grouping tabs with rules based, when you force to do it or create a new tab and open a page.

![Demo](./readme/demo-640.gif)

## Features

1. Automatically group tabs into different tab groups based on rules when you open a new page.
2. Once installed, it will automatically group existing tabs.
3. Whenever a new tab is opened, it will be automatically grouped.
4. You can force grouping all tabs by clicking the extension icon.
5. You can customize the rules.

## Demonstration

![Demo image](./readme/main.png)

## Config

Default rules are following.

```
{
  "groupingDefault": false,
  "rules": [
    {
      "name": "work",
      "hosts": [
        "*.github.com",
        "*.atlassian.net"
      ]
    },
    {
      "name": "document",
      "hosts": [
        "*.openai.com",
        "*.learn.microsoft.com"
      ]
    },
    {
      "name": "ask",
      "hosts": [
        "*.openai.com"
      ]
    }
  ]
}
```

- `groupingDefault`
  - If true, all tabs will be grouped by rules and if the rules not found then it will group by hostname.
  - If false, all tabs will be grouped by rules but do not group if no matching rules found.
- `rules`
  - `name`: Name of the group displayed in the tab name
  - `hosts`: Hostname of the tab to be grouped.

## Idea to improve

- [ ] Export user history and make chatgpt prompt to generate rules
- [ ] Add rules matching by URL path
- [ ] Bump button to trash all tabs in a group if marked as trash

