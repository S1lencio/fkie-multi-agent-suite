import TopicGroupTreeItem from "@/renderer/components/TopicTreeView/TopicGroupTreeItem";
import LoggingContext from "@/renderer/context/LoggingContext";
import { RosNode, RosTopic, TopicExtendedInfo } from "@/renderer/models";
import { EndpointExtendedInfo } from "@/renderer/models/TopicExtendedInfo";
import { Provider } from "@/renderer/providers";
import { EVENT_PROVIDER_ROS_TOPICS } from "@/renderer/providers/eventTypes";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import DvrIcon from "@mui/icons-material/Dvr";
import NotStartedOutlinedIcon from "@mui/icons-material/NotStartedOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import { alpha, Box, ButtonGroup, IconButton, Stack, Tooltip } from "@mui/material";
import { grey } from "@mui/material/colors";
import { SimpleTreeView } from "@mui/x-tree-view";
import { useDebounceCallback } from "@react-hook/debounce";
import { forwardRef, useContext, useEffect, useMemo, useState } from "react";
import { emitCustomEvent, useCustomEventListener } from "react-custom-events";
import { NewPublisherModal, OverflowMenu, SearchBar, TopicTreeItem } from "../../../components";
import { RosContext } from "../../../context/RosContext";
import { SettingsContext } from "../../../context/SettingsContext";
import { findIn } from "../../../utils/index";
import { LAYOUT_TAB_SETS, LayoutTabConfig } from "../layout";
import { EVENT_OPEN_COMPONENT, eventOpenComponent } from "../layout/events";
import TopicPublishPanel from "./TopicPublishPanel";

type TTreeItem = {
  groupKey: string;
  groupName: string;
  topics: TTreeItem[];
  count: number;
  fullPrefix: string;
  msgType: string;
  groupKeys: string[];
  topicInfo: TopicExtendedInfo | null;
};

type TProviderDscription = {
  providerId: string;
  providerName: string;
};
interface TopicsPanelProps {
  initialSearchTerm?: string;
}

const TopicsPanel = forwardRef<HTMLDivElement, TopicsPanelProps>(function TopicsPanel(props, ref) {
  const { initialSearchTerm = "" } = props;

  const EXPAND_ON_SEARCH_MIN_CHARS = 2;
  const logCtx = useContext(LoggingContext);
  const rosCtx = useContext(RosContext);
  const settingsCtx = useContext(SettingsContext);
  const [topics, setTopics] = useState<TopicExtendedInfo[]>([]); // [topicInfo: TopicExtendedInfo]
  const [filteredTopics, setFilteredTopics] = useState<TopicExtendedInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm);
  const [rootDataList, setRootDataList] = useState<TTreeItem[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [expandedFiltered, setExpandedFiltered] = useState<string[]>([]);
  const [topicForSelected, setTopicForSelected] = useState<TopicExtendedInfo | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [availableProviders, setAvailableProviders] = useState<TProviderDscription[]>([]);
  const [providerForNewPublisher, setProviderForNewPublisher] = useState<string | undefined>();
  const [tooltipDelay, setTooltipDelay] = useState<number>(settingsCtx.get("tooltipEnterDelay") as number);
  const [avoidGroupWithOneItem, setAvoidGroupWithOneItem] = useState<string>(
    settingsCtx.get("avoidGroupWithOneItem") as string
  );

  useEffect(() => {
    setTooltipDelay(settingsCtx.get("tooltipEnterDelay") as number);
    setAvoidGroupWithOneItem(settingsCtx.get("avoidGroupWithOneItem") as string);
  }, [settingsCtx, settingsCtx.changed]);

  function getAvailableProviders(): TProviderDscription[] {
    return rosCtx.providers.map((item: Provider) => {
      return { providerId: item.id, providerName: item.name() } as TProviderDscription;
    });
  }

  function genKey(items: string[]): string {
    return `${items.join("#")}`;
    //  return `${name}#${type}#${providerId}`;
  }

  async function updateTopicList(): Promise<void> {
    if (!rosCtx.initialized) return;

    const newTopicsMap = new Map();

    // Get topics from the ros node list of each provider.
    rosCtx.providers.forEach((provider) => {
      provider.rosTopics.forEach((topic: RosTopic) => {
        function addTopic(rosTopic: RosTopic, rosNode: RosNode): void {
          const topicInfo = newTopicsMap.get(genKey([rosTopic.name, rosTopic.msg_type]));
          if (topicInfo) {
            topicInfo.add(rosTopic, rosNode);
          } else {
            newTopicsMap.set(genKey([rosTopic.name, rosTopic.msg_type]), new TopicExtendedInfo(rosTopic, rosNode));
          }
        }
        topic.publisher?.forEach((pub) => {
          const rosNode = provider.rosNodes.find((node: RosNode) => node.id === pub.node_id);
          if (rosNode) {
            addTopic(topic, rosNode);
          }
        });
        topic.subscriber?.forEach((sub) => {
          const rosNode = provider.rosNodes.find((node: RosNode) => node.id === sub.node_id);
          if (rosNode) {
            addTopic(topic, rosNode);
          }
        });
      });
    });
    // sort topics by name
    const newTopics = Array.from(newTopicsMap.values());
    newTopics.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    setTopics(newTopics);
  }

  function getTopicList(): void {
    rosCtx.providers.forEach((provider) => {
      provider.updateRosTopics();
    });
  }

  useCustomEventListener(EVENT_PROVIDER_ROS_TOPICS, () => {
    updateTopicList();
  });

  // debounced search callback
  const onSearch = useDebounceCallback((newSearchTerm) => {
    setSearchTerm(newSearchTerm);
    if (!newSearchTerm) {
      setFilteredTopics(topics);
      return;
    }

    const newFilteredTopics = topics.filter((topic: TopicExtendedInfo) => {
      const isMatch = findIn(newSearchTerm, [
        topic.name,
        topic.msgType,
        ...topic.publishers.map((item: EndpointExtendedInfo) => `${item.info.node_id} ${item.providerName}`),
        ...topic.subscribers.map((item: EndpointExtendedInfo) => `${item.info.node_id} ${item.providerName}`),
      ]);
      return isMatch;
    });

    setFilteredTopics(newFilteredTopics);
  }, 300);

  // Get topic list
  useEffect(() => {
    updateTopicList();
    setAvailableProviders(getAvailableProviders());
  }, [rosCtx.initialized]);

  // Get new provider list if providers are changed
  useEffect(() => {
    setAvailableProviders(getAvailableProviders());
  }, [rosCtx.providers]);

  // Initial filter when setting the topics
  useEffect(() => {
    onSearch(searchTerm);
  }, [topics, searchTerm]);

  // create tree based on topic namespace
  // topics are grouped only if more then one is in the group
  function fillTree(fullPrefix: string, topicsGroup: TopicExtendedInfo[], itemId: string): TTreeItem {
    const byPrefixP1 = new Map<string, { restNameSuffix: string; topicInfo: TopicExtendedInfo; isGroup: boolean }[]>();
    // create a map with simulated tree for the namespaces of the topic list
    topicsGroup.forEach((topicInfo) => {
      const nameSuffix = topicInfo.name.slice(fullPrefix.length + 1);
      const [groupName, ...restName] = nameSuffix.split("/");
      if (restName.length > 0) {
        const restNameSuffix = restName.join("/");
        if (byPrefixP1.has(groupName)) {
          byPrefixP1.get(groupName)?.push({ restNameSuffix, topicInfo, isGroup: true });
        } else {
          byPrefixP1.set(groupName, [{ restNameSuffix, topicInfo, isGroup: true }]);
        }
      } else {
        byPrefixP1.set(groupName, [{ restNameSuffix: "", topicInfo, isGroup: false }]);
      }
    });

    // create result
    let count = 0;
    const groupKeys: string[] = [];
    const newFilteredTopics: TTreeItem[] = [];
    byPrefixP1.forEach((value, groupName) => {
      // don't create group with one parameter
      const newFullPrefix: string = `${fullPrefix}/${groupName}`;
      let topicValues = value.filter((item) => !item.isGroup);
      if (avoidGroupWithOneItem && value.length - topicValues.length === 1) {
        topicValues = value;
      }
      const groupValues = value.filter((item) => !topicValues.includes(item));
      if (groupValues.length > 0) {
        const groupKey: string = itemId ? `${itemId}-${groupName}` : groupName;
        groupKeys.push(groupKey);
        const groupTopics = groupValues.map((item) => {
          return item.topicInfo;
        });
        const subResult = fillTree(newFullPrefix, groupTopics, groupKey);
        // the result count is 0 -> we added multiple provider for topic with same name.
        if (subResult.count === 0) {
          count += 1;
        } else {
          count += subResult.count;
        }
        if (subResult.groupKeys.length > 0) {
          groupKeys.push(...subResult.groupKeys);
        }
        // if all topics of the group have same message id, show it in the group info
        let msgType: string | undefined = undefined;
        groupValues.map((item) => {
          if (msgType === undefined) {
            msgType = item.topicInfo.msgType;
          } else if (msgType !== item.topicInfo.msgType) {
            if (msgType !== "") {
              msgType = "";
            }
          }
        });
        newFilteredTopics.push({
          groupKey: groupKey,
          groupName: `/${groupName}`,
          topics: subResult.topics,
          count: subResult.count,
          fullPrefix: newFullPrefix,
          msgType: msgType ? msgType : "",
          groupKeys: groupKeys,
          topicInfo: null,
        } as TTreeItem);
      }
      topicValues.forEach((item) => {
        newFilteredTopics.push({
          groupKey: "",
          groupName: "",
          topics: [],
          count: 0,
          fullPrefix: newFullPrefix,
          msgType: item.topicInfo.msgType,
          groupKeys: groupKeys,
          topicInfo: item.topicInfo,
        } as TTreeItem);
        count += 1;
        // if (item.topicInfo.providerName !== groupName) {
        //   // since the same topic can be on multiple provider
        //   // we count only topics
        //   count += 1;
        // }
      });
    });
    return { topics: newFilteredTopics, count, groupKeys } as TTreeItem;
  }

  // create topics tree from filtered topic list
  useEffect(() => {
    const tree = fillTree("", filteredTopics, "");
    setRootDataList(tree.topics);
    if (searchTerm.length < EXPAND_ON_SEARCH_MIN_CHARS) {
      setExpandedFiltered(tree.groupKeys);
    }
  }, [filteredTopics, avoidGroupWithOneItem]);

  function onEchoClick(
    topic: TopicExtendedInfo | null,
    external: boolean,
    openInTerminal: boolean = false,
    providerId: string = ""
  ): void {
    if (topic) {
      const provId = providerId ? providerId : topic.publishers.length > 0 ? topic.publishers[0].providerId : "";
      if (provId) {
        rosCtx.openSubscriber(provId, topic.name, true, false, external, openInTerminal);
      } else {
        logCtx.warn("no publisher available");
      }
    }
  }

  function onPublishClick(topic: TopicExtendedInfo | null, providerId: string = ""): void {
    if (topic) {
      let provId = providerId ? providerId : undefined;
      if (!provId) {
        provId = topic.subscribers.length > 0 ? topic.subscribers[0].providerId : undefined;
      }
      if (!provId) {
        provId = topic.publishers.length > 0 ? topic.publishers[0].providerId : undefined;
      }
      if (provId) {
        emitCustomEvent(
          EVENT_OPEN_COMPONENT,
          eventOpenComponent(
            `publish-${topic.name}-${provId}`,
            topic.name,
            <TopicPublishPanel topicName={topic.name} topicType={topic.msgType} providerId={provId} />,
            true,
            LAYOUT_TAB_SETS.BORDER_RIGHT,
            new LayoutTabConfig(true, "publish")
          )
        );
      } else {
        logCtx.warn("no subscriber/publisher available");
      }
    }
  }

  function topicTreeToStyledItems(rootPath: string, treeItem: TTreeItem, selectedItem: string | null): JSX.Element {
    if (treeItem.topicInfo) {
      return (
        <TopicTreeItem
          key={genKey([treeItem.topicInfo.name, treeItem.topicInfo.msgType])}
          itemId={genKey([treeItem.topicInfo.name, treeItem.topicInfo.msgType])}
          rootPath={rootPath}
          topicInfo={treeItem.topicInfo}
          selectedItem={selectedItem}
        />
      );
    } else {
      return (
        <TopicGroupTreeItem
          key={treeItem.groupKey}
          itemId={treeItem.groupKey}
          rootPath={rootPath}
          groupName={treeItem.groupName}
          countChildren={treeItem.count}
        >
          {treeItem.topics.map((subItem) => {
            return topicTreeToStyledItems(treeItem.fullPrefix, subItem, selectedItem);
          })}
        </TopicGroupTreeItem>
      );
    }
  }

  useEffect(() => {
    const selectedTopics = filteredTopics.filter((item) => {
      return genKey([item.name, item.msgType]) === selectedItem;
    });
    if (selectedTopics?.length > 0) {
      setTopicForSelected(selectedTopics[0]);
    } else {
      setTopicForSelected(null);
    }
  }, [filteredTopics, selectedItem]);

  function handleToggle(itemIds: string[]): void {
    if (searchTerm.length < EXPAND_ON_SEARCH_MIN_CHARS) {
      setExpanded(itemIds);
    } else {
      setExpandedFiltered(itemIds);
    }
  }

  const createButtonBox = useMemo(() => {
    return (
      <ButtonGroup orientation="vertical" aria-label="topic control group">
        <Tooltip
          title="Echo (shift+click for alternative open location)"
          placement="left"
          enterDelay={tooltipDelay}
          // enterNextDelay={tooltipDelay}
          disableInteractive
        >
          <span>
            <IconButton
              disabled={!topicForSelected}
              size="medium"
              aria-label="Subscribe to topic and show the output"
              onClick={(event) => {
                onEchoClick(topicForSelected, event.nativeEvent.shiftKey, event.nativeEvent.ctrlKey);
              }}
            >
              <ChatBubbleOutlineIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>

        <OverflowMenu
          disabled={!topicForSelected}
          icon={
            <Tooltip
              title="Echo with option to select the host on which the subscriber is to be started (shift+click for alternative open location)"
              placement="left"
              enterDelay={tooltipDelay}
              // enterNextDelay={tooltipDelay}
              disableInteractive
            >
              <ChatOutlinedIcon fontSize="inherit" />
            </Tooltip>
          }
          size="medium"
          sx={{ margin: 0 }}
          options={availableProviders.map((item) => {
            return {
              name: item.providerName,
              key: item.providerId,
              onClick: async function (event?: React.MouseEvent): Promise<void> {
                onEchoClick(
                  topicForSelected,
                  event?.nativeEvent.shiftKey || false,
                  event?.nativeEvent.ctrlKey || false,
                  item.providerId
                );
              },
            };
          })}
          id={`echo-provider-menu-${topicForSelected?.name}`}
        />
        <Tooltip
          title="Echo in Terminal"
          placement="left"
          enterDelay={tooltipDelay}
          // enterNextDelay={tooltipDelay}
          disableInteractive
        >
          <span>
            <IconButton
              disabled={!topicForSelected}
              size="medium"
              aria-label="Subscribe to topic and show the output"
              onClick={(event) => {
                onEchoClick(topicForSelected, event.nativeEvent.shiftKey, true);
              }}
            >
              <DvrIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip
          title="Publish to"
          placement="left"
          enterDelay={tooltipDelay}
          // enterNextDelay={tooltipDelay}
          disableInteractive
        >
          <span>
            <IconButton
              disabled={!topicForSelected}
              size="medium"
              aria-label="Create a publisher"
              onClick={() => {
                onPublishClick(topicForSelected);
              }}
            >
              <SlideshowOutlinedIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
        <OverflowMenu
          disabled={!topicForSelected}
          icon={
            <Tooltip
              title="Publish with option to select the host on which the publisher is to be started"
              placement="left"
              enterDelay={tooltipDelay}
              // enterNextDelay={tooltipDelay}
              disableInteractive
            >
              <PlayCircleOutlineIcon fontSize="inherit" />
            </Tooltip>
          }
          size="medium"
          sx={{ margin: 0 }}
          options={availableProviders.map((item) => {
            return {
              name: item.providerName,
              key: item.providerId,
              onClick: async function (): Promise<void> {
                onPublishClick(topicForSelected, item.providerId);
              },
            };
          })}
          id={`echo-provider-menu-${topicForSelected?.name}`}
        />
        {availableProviders.length === 1 ? (
          <Tooltip
            title="Publish to"
            placement="left"
            enterDelay={tooltipDelay}
            // enterNextDelay={tooltipDelay}
            disableInteractive
          >
            <span>
              <IconButton
                size="medium"
                aria-label="Create a new publisher"
                onClick={() => {
                  setProviderForNewPublisher(availableProviders[0].providerId);
                }}
              >
                <NotStartedOutlinedIcon fontSize="inherit" />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          availableProviders.length > 1 && (
            <OverflowMenu
              // disabled={!topicForSelected}
              icon={
                <Tooltip
                  title="Publish to a new topic with option to select the host on which the publisher is to be started"
                  placement="left"
                  enterDelay={tooltipDelay}
                  // enterNextDelay={tooltipDelay}
                  disableInteractive
                >
                  <NotStartedOutlinedIcon fontSize="inherit" />
                </Tooltip>
              }
              size="medium"
              sx={{ margin: 0 }}
              options={availableProviders.map((item) => {
                return {
                  name: item.providerName,
                  key: item.providerId,
                  onClick: async function (): Promise<void> {
                    setProviderForNewPublisher(item.providerId);
                  },
                };
              })}
              id={`echo-provider-menu-${topicForSelected?.name}`}
            />
          )
        )}
      </ButtonGroup>
    );
  }, [tooltipDelay, topicForSelected, availableProviders]);

  const createTreeView = useMemo(() => {
    return (
      <SimpleTreeView
        aria-label="topics"
        expandedItems={searchTerm.length < EXPAND_ON_SEARCH_MIN_CHARS ? expanded : expandedFiltered}
        slots={{ collapseIcon: ArrowDropDownIcon, expandIcon: ArrowRightIcon }}
        // defaultEndIcon={<div style={{ width: 24 }} />}
        expansionTrigger={"iconContainer"}
        onExpandedItemsChange={(_event, itemIds) => handleToggle(itemIds)}
        onSelectedItemsChange={(_event, itemId) => {
          setSelectedItem(itemId || "");
          const copyExpanded = [...(searchTerm.length < EXPAND_ON_SEARCH_MIN_CHARS ? expanded : expandedFiltered)];
          if (itemId) {
            const index =
              searchTerm.length < EXPAND_ON_SEARCH_MIN_CHARS
                ? expanded.indexOf(itemId)
                : expandedFiltered.indexOf(itemId);
            if (index === -1) {
              if (itemId) {
                copyExpanded.push(itemId);
              }
            } else {
              copyExpanded.splice(index, 1);
            }
          }
          if (searchTerm.length < EXPAND_ON_SEARCH_MIN_CHARS) {
            setExpanded(copyExpanded);
          } else {
            setExpandedFiltered(copyExpanded);
          }
        }}
      >
        {rootDataList.map((item) => {
          return topicTreeToStyledItems("", item, selectedItem);
        })}
      </SimpleTreeView>
    );
  }, [expanded, expandedFiltered, rootDataList, searchTerm]);

  const createPanel = useMemo(() => {
    return (
      <Box
        ref={ref}
        height="100%"
        overflow="auto"
        sx={{ backgroundColor: settingsCtx.get("backgroundColor") as string }}
      >
        <Stack
          spacing={1}
          height="100%"
          // sx={{
          //   height: '100%',
          //   display: 'flex',
          // }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Reload topic list" placement="left" disableInteractive>
              <IconButton
                size="small"
                onClick={() => {
                  getTopicList();
                }}
              >
                <RefreshIcon sx={{ fontSize: "inherit" }} />
              </IconButton>
            </Tooltip>
            <SearchBar
              onSearch={(term) => onSearch(term)}
              placeholder="Filter Topics (OR: <space>, AND: +, NOT: !)"
              defaultValue={initialSearchTerm}
              fullWidth
            />
          </Stack>
          <Stack direction="row" height="100%" overflow="auto">
            <Box height="100%" sx={{ boxShadow: `0px 0px 5px ${alpha(grey[600], 0.4)}` }}>
              {/* <Box height="100%" sx={{ borderRight: "solid", borderColor: "#D3D3D3", borderWidth: 1 }}> */}
              {/* <Paper elevation={0} sx={{ border: 1 }} height="100%"> */}
              {createButtonBox}
              {/* </Paper> */}
            </Box>
            <Box width="100%" height="100%" overflow="auto">
              {createTreeView}
            </Box>
          </Stack>
          {providerForNewPublisher && (
            <NewPublisherModal
              providerId={providerForNewPublisher}
              onClose={() => setProviderForNewPublisher(undefined)}
            />
          )}
        </Stack>
      </Box>
    );
  }, [
    rootDataList,
    expanded,
    expandedFiltered,
    searchTerm,
    selectedItem,
    topicForSelected,
    settingsCtx.changed,
    providerForNewPublisher,
  ]);
  return createPanel;
});

export default TopicsPanel;
