import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { preferences } from "./preferences";
import { Service, TimeEntry, Timer } from "./productiveio-api.types";
import {
  formatDateRelative,
  formatDuration,
  isCurrentWeek,
  isToday,
  isWithinLast7Days,
  isYesterday,
  stripHtml,
} from "./utils";
import "isomorphic-fetch";

const baseUrl = "https://api.productive.io/api";

const productiveHeaders = {
  "X-Auth-Token": preferences.apiToken,
  "X-Organization-Id": preferences.orgId,
};

export default function Command() {
  const timeEntries = useFetch<{
    data: TimeEntry[];
  }>(`${baseUrl}/v2/time_entries?include=service,task,person`, {
    keepPreviousData: true,
    headers: productiveHeaders,
  });
  if (timeEntries.error) {
    console.error(timeEntries.error);
  }

  const services = useFetch<{
    data: Service[];
  }>(`${baseUrl}/v2/services?include=section,deal`, { keepPreviousData: true, headers: productiveHeaders });
  if (services.error) {
    console.error(services.error);
  }

  const sections = useFetch<{
    data: Service[];
  }>(`${baseUrl}/v2/sections`, { keepPreviousData: true, headers: productiveHeaders });
  if (sections.error) {
    console.error(sections.error);
  }

  const now = new Date().valueOf();
  const oneDay = 1000 * 60 * 60 * 24;
  const todayString = new Date(now).toISOString().split("T")[0];
  const yesterday = new Date(now - oneDay).toISOString().split("T")[0];

  const timers = useFetch<{
    data: Timer[];
  }>(`${baseUrl}/v2/timers?include=time_entry&filter[started_at]=${todayString}`, {
    keepPreviousData: true,
    headers: productiveHeaders,
  });
  if (sections.error) {
    console.error(sections.error);
  }

  if (timeEntries.error || services.error) {
    return <List.EmptyView title={(timeEntries.error || services.error)!.message}></List.EmptyView>;
  }

  const updateTimeEntry = async (
    id: string,
    attr: Partial<TimeEntry["attributes"]>,
    toastData: { loadingTitle: string; successTitle: string; errorTitle: string },
  ) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: toastData.loadingTitle });
    try {
      await timeEntries.mutate(
        fetch(`${baseUrl}/v2/time_entries/${id}`, {
          method: "PATCH",
          headers: {
            Accept:
              "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5",
            "Content-Type": "application/vnd.api+json",
            ...productiveHeaders,
          },
          body: JSON.stringify({
            data: { attributes: attr },
            type: "time-entries",
          }),
        }).then(async (res) => {
          const body = await res.json();
          console.log(body);

          if (!res.ok) {
            throw new Error(`${res.status} ${res.statusText}`);
          }

          return body;
        }),
        {
          // but we are going to do it on our local data right away,
          // without waiting for the call to return
          // optimisticUpdate(data) {
          //   return data + "foo";
          // },
        },
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = toastData.successTitle;
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = toastData.errorTitle;
      toast.message = (err as any).message;
    }
  };

  const stopTimer = async (id: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping timer" });
    try {
      await timeEntries.mutate(
        fetch(`${baseUrl}/v2/timers/${id}/stop`, {
          method: "PATCH",
          headers: {
            Accept:
              "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5",
            "Content-Type": "application/vnd.api+json",
            ...productiveHeaders,
          },
        }).then(async (res) => {
          const body = await res.json();
          if (!res.ok) {
            console.log(body);
            throw new Error(`${res.status} ${res.statusText}`);
          }

          return body;
        }),
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Timer stopped";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop timer";
      toast.message = (err as any).message;
    }
  };

  const recreateTimeEntryAndStartTimer = async (timeEntry: TimeEntry) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Recreating time entry" });
    try {
      await timeEntries.mutate(
        (async () => {
          const newTimeEntryResponse: { data: TimeEntry } = await fetch(`${baseUrl}/v2/time_entries`, {
            method: "POST",
            headers: {
              Accept:
                "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5",
              "Content-Type": "application/vnd.api+json",
              ...productiveHeaders,
            },
            body: JSON.stringify({
              data: {
                type: "time_entries",
                attributes: {
                  note: timeEntry.attributes.note,
                  date: todayString,
                  time: 0,
                  started_at: new Date().toISOString(),
                },
                relationships: {
                  person: { data: { type: "people", id: timeEntry.relationships.person.data.id } },
                  service: { data: { type: "services", id: timeEntry.relationships.service.data.id } },

                  ...(timeEntry.relationships.task.data
                    ? { task: { data: { type: "tasks", id: timeEntry.relationships.task.data.id } } }
                    : {}),
                },
              },
            }),
          }).then(async (res) => {
            const body = await res.json();
            if (!res.ok) {
              console.log(body);
              throw new Error(`${res.status} ${res.statusText}`);
            }

            return body;
          });

          console.log(newTimeEntryResponse);

          toast.style = Toast.Style.Animated;
          toast.title = "Starting timer";
          const timer: { data: Timer } = await fetch(`${baseUrl}/v2/timers`, {
            method: "POST",
            headers: {
              Accept:
                "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5",
              "Content-Type": "application/vnd.api+json",
              ...productiveHeaders,
            },
            body: JSON.stringify({
              data: {
                type: "timers",
                attributes: {},
                relationships: {
                  time_entry: { data: { type: "time_entries", id: newTimeEntryResponse.data.id } },
                  // service: { data: { type: "services", id: timeEntry.relationships.service.data.id } },
                },
              },
            }),
          }).then(async (res) => {
            const body = await res.json();
            if (!res.ok) {
              console.log(JSON.stringify(body, null, 4));
              throw new Error(`${res.status} ${res.statusText}`);
            }

            return body;
          });

          console.log(timer);
        })(),
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Timer restarted";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to restart timer";
      toast.message = (err as any).message;
    }
  };

  if (timeEntries.data) {
    const entries = timeEntries.data.data
      .filter((entry) => isWithinLast7Days(new Date(entry.attributes.date)))
      .map((entry) => {
        const service = services.data?.data.find((service) => service.id === entry.relationships.service.data.id);
        const notes = stripHtml(entry.attributes.note || "");
        const section = sections.data?.data.find((section) => section.id === service?.relationships.section.data.id);

        const title = [
          notes ? "" : service?.attributes.name,
          preferences.simplifyJiraLinks ? notes.replace(/https?:\/\/\w+.atlassian\.net\/browse\//, "") : notes,
        ]
          .filter(Boolean)
          .join(" / ")
          .trim();

        const isRunning = entry.attributes.timer_stopped_at === null && entry.attributes.timer_started_at !== null;
        const isEntryToday = isToday(new Date(entry.attributes.date));
        const startedAt = entry.attributes.started_at ? new Date(entry.attributes.started_at) : null;
        const startedAtString = startedAt?.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

        const stoppedAt = entry.attributes.timer_stopped_at ? new Date(entry.attributes.timer_stopped_at) : null;
        const stoppedAtString = stoppedAt
          ? stoppedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
          : "";

        const durationMins = isRunning
          ? Math.round(((stoppedAt || new Date()).valueOf() - (startedAt || new Date()).valueOf()) / 1000 / 60)
          : entry.attributes.time;
        const durationString = formatDuration(durationMins);

        const absDateString = startedAt?.toISOString().split("T")[0];
        const relDateString = isEntryToday
          ? ""
          : isYesterday(new Date(entry.attributes.date))
            ? "Yesterday"
            : formatDateRelative(startedAt || new Date());

        return {
          ...entry,
          service,
          section,
          title,
          notes,
          isRunning,
          isToday: isEntryToday,
          startedAtString,
          stoppedAtString,
          durationMins,
          durationString,
          relDateString,
          absDateString,
        };
      });

    const totalDuration = entries.filter((entry) => entry.isToday).reduce((acc, entry) => acc + entry.durationMins, 0);

    return (
      <List
        isLoading={timeEntries.isLoading || services.isLoading || sections.isLoading}
        searchBarPlaceholder={`Search for time entries (total today: ${formatDuration(totalDuration)})`}
      >
        {entries.map((entry) => {
          const timeString =
            (entry.isRunning
              ? entry.startedAtString
                ? `Started at ${entry.startedAtString}`
                : "No timer started"
              : `${entry.startedAtString} - ${entry.stoppedAtString}`) + ` (${entry.durationString})`;

          return (
            <List.Item
              id={entry.id}
              key={entry.id}
              icon={entry.isRunning ? Icon.Clock : entry.isToday ? Icon.Circle : Icon.CircleProgress100}
              title={(entry.relDateString ? entry.relDateString + ": " : "") + entry.title}
              subtitle={timeString}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Info}
                    target={
                      <Detail
                        markdown={`
| Title | ${entry.title || "No note"} |
| --- | --- |
| Time | ${timeString} |
| Date | ${entry.relDateString || "Today"} (${entry.absDateString}) |
| Service | ${entry.service?.attributes.name} |
| Section | ${entry.section?.attributes.name} |

\`\`\`json
${JSON.stringify(entry, null, 4)}
\`\`\`
                        `}
                      ></Detail>
                    }
                  />

                  {entry.isRunning && (
                    <Action
                      title="Stop Timer"
                      icon={Icon.Stop}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => {
                        const timer = timers.data?.data.find(
                          (timer) => timer.relationships.time_entry.data.id === entry.id,
                        );
                        if (!timer) {
                          console.error("No timer found for time entry", entry);
                          showFailureToast(new Error("No timer found for time entry"));
                          return;
                        }

                        stopTimer(timer.id);
                      }}
                    ></Action>
                  )}
                  {!entry.isRunning && (
                    <Action
                      title="Recreate Time Entry and Start Timer"
                      icon={Icon.Stopwatch}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={async () => {
                        // Stop the timer if it's running
                        const runningTimeEntry = entries.find((e) => e.isRunning);
                        const runningTimer =
                          runningTimeEntry &&
                          timers.data?.data.find(
                            (timer) => timer.relationships.time_entry.data.id === runningTimeEntry?.id,
                          );
                        if (runningTimer) {
                          await stopTimer(runningTimer.id);
                        }

                        await recreateTimeEntryAndStartTimer(entry);
                      }}
                    ></Action>
                  )}
                  <Action.CopyToClipboard
                    title="Copy Time Entry Notes"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    content={entry.notes}
                  ></Action.CopyToClipboard>
                  <Action.CopyToClipboard
                    title="Copy Time Entry Notes as Html"
                    content={entry.attributes.note || ""}
                  ></Action.CopyToClipboard>
                </ActionPanel>
              }
            />
          );
        })}
      </List>
    );
  }

  if (timeEntries.isLoading || services.isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Search for time entries" />;
  }

  return (
    <List>
      <List.EmptyView title="Unhandled state"></List.EmptyView>;
    </List>
  );
}
