/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import * as React from 'react';

import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight,
  TextInput,
  FlatList,
  ListRenderItemInfo,
  SafeAreaView,
  TouchableNativeFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  ChatClient,
  ChatConnectEventListener,
  ChatMessage,
  ChatMessageChatType,
  ChatMessageEventListener,
  ChatMessageStatusCallback,
  ChatMessageType,
  ChatOptions,
  ChatPushConfig,
  ChatTextMessageBody,
} from 'react-native-chat-sdk';
import {
  ChatPushClient,
  getPlatform,
  getDeviceType,
  type PushType,
  type ChatPushListener,
} from 'react-native-push-collection';

const env = require('./env.ts') as {
  appKey: string;
  deviceIds: {
    [key: string]: string;
  };
  userId: string;
  userToken: string;
  targetId: string;
};
console.log('env:', env);

type MessageItem = {
  id: string;
  text: string;
};

const MessageItemView = React.memo((props: {item: MessageItem}) => {
  const {item} = props;
  return (
    <View style={styles.listItem}>
      <Text style={styles.id}>{item.id}</Text>
      <Text style={styles.text}>{item.text}</Text>
    </View>
  );
});

export default function App() {
  const pushTypeMemo = React.useMemo(() => {
    let ret: PushType;
    const platform = getPlatform();
    if (platform === 'ios') {
      ret = 'fcm';
    } else {
      ret = (getDeviceType() ?? 'unknown') as PushType;
    }
    return ret;
  }, []);

  const pushTypeRef = React.useRef<PushType>(pushTypeMemo);
  const appKeyRef = React.useRef<string>(env.appKey);
  const deviceIdRef = React.useRef<string>(env.deviceIds[pushTypeRef.current]);
  const tokenRef = React.useRef<string>();
  const contentInputRef = React.useRef<TextInput>(null);
  const [data, setData] = React.useState<MessageItem[]>([]);
  const [userId, setUserId] = React.useState<string>(env.userId);
  const [userToken, setUserToken] = React.useState<string>(env.userToken);
  const [targetId, setTargetId] = React.useState<string>(env.targetId);
  const [content, setContent] = React.useState<string>('');
  const [appKey, setAppKey] = React.useState<string>(appKeyRef.current);

  const onLog = React.useCallback((c: string) => {
    console.log(c);
    const t = `log: ${c}`;
    setData(prev => {
      return [{id: new Date().getTime().toString(), text: t}, ...prev];
    });
  }, []);

  const init = React.useCallback(() => {
    onLog(`push:init:start: ${pushTypeRef.current}, ${deviceIdRef.current}`);
    ChatPushClient.getInstance()
      .init({
        platform: getPlatform(),
        pushType: pushTypeRef.current as any,
      })
      .then(() => {
        onLog('push:init:success');
        ChatPushClient.getInstance().addListener({
          onError: error => {
            onLog('onError:' + JSON.stringify(error));
          },
          onReceivePushMessage: message => {
            onLog('onReceivePushMessage:' + JSON.stringify(message));
          },
          onReceivePushToken: token => {
            onLog('onReceivePushToken:' + token);
            if (token) {
              tokenRef.current = token;
              ChatClient.getInstance()
                .updatePushConfig(
                  new ChatPushConfig({
                    deviceId: deviceIdRef.current,
                    deviceToken: token,
                  }),
                )
                .then(() => {
                  onLog('updatePushConfig:success');
                })
                .catch(e => {
                  onLog('updatePushConfig:error:' + JSON.stringify(e));
                });
            }
          },
        } as ChatPushListener);
      })
      .catch(e => {
        onLog('push:init:failed:' + JSON.stringify(e));
      });

    ChatClient.getInstance()
      .init(
        new ChatOptions({
          autoLogin: false,
          debugModel: true,
          appKey: appKey,
          pushConfig: new ChatPushConfig({
            deviceId: deviceIdRef.current,
            deviceToken: tokenRef.current,
          }),
        }),
      )
      .then(() => {
        onLog('chat:init:success');
        ChatClient.getInstance().addConnectionListener({
          onConnected: () => {
            onLog('onConnected');
          },
          onDisconnected: () => {
            onLog('onDisconnected');
          },
        } as ChatConnectEventListener);
      })
      .catch(e => {
        onLog('chat:init:failed:' + JSON.stringify(e));
      });
  }, [appKey, onLog]);

  const onInit = () => {
    init();
  };

  const onGetTokenAsync = async () => {
    onLog('push:getTokenAsync:start');
    const ret = await requestPermission();
    if (ret === false) {
      return;
    }
    ChatPushClient.getInstance()
      .getTokenAsync()
      .then(() => {
        onLog('push:getTokenAsync:success');
      })
      .catch(e => {
        onLog('push:getTokenAsync:failed:' + JSON.stringify(e));
      });
  };

  const onRegister = async () => {
    onLog('push:registerPush:start');
    const ret = await requestPermission();
    if (ret === false) {
      return;
    }
    ChatPushClient.getInstance()
      .registerPush()
      .then(() => {
        onLog('push:registerPush:success');
      })
      .catch(e => {
        onLog('push:registerPush:failed:' + JSON.stringify(e));
      });
  };

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const version = Platform.Version;
      if (version >= 33) {
        const status = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (status === PermissionsAndroid.RESULTS.GRANTED) {
          onLog('push:requestPermission:success');
          return true;
        } else {
          return false;
        }
      }
    }
    return true;
  };

  const onLoginAction = () => {
    onLog('chat:login:start');
    ChatClient.getInstance()
      .login(userId, userToken, true)
      .then(() => {
        onLog('chat:login:success');
        ChatClient.getInstance().chatManager.addMessageListener({
          onMessagesReceived: (messages: Array<ChatMessage>) => {
            for (const msg of messages) {
              if (msg.body.type === ChatMessageType.TXT) {
                const body = msg.body as ChatTextMessageBody;
                setData(prev => {
                  return [{id: msg.msgId, text: body.content}, ...prev];
                });
              }
            }
          },
        } as ChatMessageEventListener);
      })
      .catch(e => {
        onLog('chat:login:failed:' + JSON.stringify(e));
      });
  };

  const onLogoutAction = () => {
    onLog('chat:logout:start');
    ChatClient.getInstance()
      .logout(true)
      .then(() => {
        onLog('chat:logout:success');
      })
      .catch(e => {
        onLog('chat:logout:failed:' + JSON.stringify(e));
      });
  };

  const onSendMessage = () => {
    onLog('chat:sendMessage:start');
    const msg = ChatMessage.createTextMessage(
      targetId,
      content,
      ChatMessageChatType.PeerChat,
    );
    ChatClient.getInstance().chatManager.sendMessage(msg, {
      onError: e => {
        onLog('chat:sendMessage:failed:' + JSON.stringify(e));
      },
      onSuccess: (newMsg: ChatMessage) => {
        const body = newMsg.body as ChatTextMessageBody;
        setData(prev => {
          return [{id: newMsg.msgId, text: body.content}, ...prev];
        });
        contentInputRef.current?.clear();
      },
    } as ChatMessageStatusCallback);
  };

  const onChangeAppKey = (key: string) => {
    setAppKey(key);
  };

  const onChangeUserId = (u: string) => {
    setUserId(u);
  };

  const onChangeUserToken = (t: string) => {
    setUserToken(t);
  };

  const onChangeTargetId = (t: string) => {
    setTargetId(t);
  };

  const onChangeContent = (c: string) => {
    setContent(c);
  };

  const renderItem = (info: ListRenderItemInfo<MessageItem>) => {
    const {item} = info;
    return <MessageItemView item={item} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableNativeFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.target}>
          <KeyboardAvoidingView style={styles.input}>
            <TextInput
              onChangeText={onChangeAppKey}
              placeholder="appkey:"
              autoCapitalize="none"
              value={appKey}
            />
          </KeyboardAvoidingView>
        </View>
      </TouchableNativeFeedback>

      <TouchableHighlight
        underlayColor={'#fffaf0'}
        style={styles.button}
        onPress={onInit}>
        <Text>{'init action'}</Text>
      </TouchableHighlight>

      <TouchableNativeFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.target}>
          <KeyboardAvoidingView style={styles.input}>
            <TextInput
              onChangeText={onChangeUserId}
              placeholder="user id"
              autoCapitalize="none"
              value={userId}
            />
          </KeyboardAvoidingView>
          <KeyboardAvoidingView style={styles.input}>
            <TextInput
              onChangeText={onChangeUserToken}
              placeholder="user pass"
              autoCapitalize="none"
              value={userToken}
            />
          </KeyboardAvoidingView>
        </View>
      </TouchableNativeFeedback>

      <TouchableHighlight
        underlayColor={'#fffaf0'}
        style={styles.button}
        onPress={onLoginAction}>
        <Text>{'login action'}</Text>
      </TouchableHighlight>
      <TouchableHighlight
        underlayColor={'#fffaf0'}
        style={styles.button}
        onPress={onGetTokenAsync}>
        <Text>{'get token async'}</Text>
      </TouchableHighlight>
      <TouchableHighlight
        underlayColor={'#fffaf0'}
        style={styles.button}
        onPress={onRegister}>
        <Text>{'register async'}</Text>
      </TouchableHighlight>
      <TouchableHighlight
        underlayColor={'#fffaf0'}
        style={styles.button}
        onPress={onLogoutAction}>
        <Text>{'logout action'}</Text>
      </TouchableHighlight>

      <TouchableNativeFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.target}>
          <Text>{'target id:'}</Text>
          <KeyboardAvoidingView style={styles.input}>
            <TextInput
              onChangeText={onChangeTargetId}
              placeholder="target id"
              autoCapitalize="none"
              value={targetId}
            />
          </KeyboardAvoidingView>
        </View>
      </TouchableNativeFeedback>

      <TouchableNativeFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.target}>
          <Text>{'content:'}</Text>
          <KeyboardAvoidingView style={styles.content}>
            <TextInput
              ref={contentInputRef}
              onChangeText={onChangeContent}
              placeholder="text content"
              autoCapitalize="none"
            />
          </KeyboardAvoidingView>
        </View>
      </TouchableNativeFeedback>

      <TouchableHighlight
        underlayColor={'#fffaf0'}
        style={styles.button}
        onPress={onSendMessage}>
        <Text>{'send text message'}</Text>
      </TouchableHighlight>

      <View style={styles.list}>
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item: MessageItem) => {
            return item.id;
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
  },
  button: {
    height: 40,
    marginVertical: 4,
    backgroundColor: 'lightblue',
    justifyContent: 'center',
    alignItems: 'center',
  },
  target: {
    maxWidth: '100%',
    flexDirection: 'row',
    margin: 2,
  },
  input: {
    flex: 1,
    height: Platform.select({ios: 30, android: undefined}),
    backgroundColor: 'lightyellow',
    margin: 2,
  },
  content: {
    flex: 1,
    height: Platform.select({ios: 30, android: undefined}),
    backgroundColor: 'lightyellow',
  },
  list: {
    flex: 1,
    backgroundColor: 'lightyellow',
  },
  listItem: {
    margin: 2,
    flexDirection: 'row',
    backgroundColor: 'lightyellow',
    // height: 20,
  },
  id: {
    color: 'black',
  },
  text: {
    color: 'red',
    flex: 1,
  },
});
