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
  Pressable,
  ToastAndroid,
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
  deviceId: string;
  userId: string;
  userToken: string;
  targetId: string;
};
console.log('test:zuoyu:env:', env);

type MessageItem = {
  id: string;
  text: string;
};

const MessageItemView = React.memo((props: {item: MessageItem}) => {
  const {item} = props;
  return (
    <View style={styles.listItem}>
      <Text style={styles.id}>{item.id}</Text>
      <Text style={styles.text} numberOfLines={1}>
        {item.text}
      </Text>
    </View>
  );
});

export default function App() {
  const appKeyRef = React.useRef<string>(env.appKey);
  const deviceIdRef = React.useRef<string>(env.deviceId);
  const tokenRef = React.useRef<string>();
  const contentInputRef = React.useRef<TextInput>(null);
  const [data, setData] = React.useState<MessageItem[]>([]);
  const [userId, setUserId] = React.useState<string>(env.userId);
  const [userToken, setUserToken] = React.useState<string>(env.userToken);
  const [targetId, setTargetId] = React.useState<string>(env.targetId);
  const [content, setContent] = React.useState<string>('');

  const init = React.useCallback(() => {
    const platform = getPlatform();
    let pushType: PushType;
    if (platform === 'ios') {
      pushType = 'fcm';
    } else {
      pushType = (getDeviceType() ?? 'unknown') as PushType;
    }
    console.log('test:zuoyu:init:', pushType);
    ChatPushClient.getInstance()
      .init({
        platform: getPlatform(),
        pushType: pushType as any,
      })
      .then(() => {
        console.log('test:zuoyu:init:addListener');
        ToastAndroid.show('push:init:success', ToastAndroid.SHORT);
        ChatPushClient.getInstance().addListener({
          onError: error => {
            console.warn('test:zuoyu:onError:', error);
            ToastAndroid.show(
              'onError' + JSON.stringify(error),
              ToastAndroid.SHORT,
            );
          },
          onReceivePushMessage: message => {
            console.log('test:zuoyu:onReceivePushMessage:', message);
            ToastAndroid.show(
              'onReceivePushMessage' + JSON.stringify(message),
              ToastAndroid.SHORT,
            );
          },
          onReceivePushToken: token => {
            console.log('test:zuoyu:onReceivePushToken:', token);
            ToastAndroid.show('onReceivePushToken' + token, ToastAndroid.SHORT);
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
                  console.log('test:zuoyu:updatePushConfig:success');
                })
                .catch(e => {
                  console.warn('test:zuoyu:updatePushConfig:error:', e);
                });
            }
          },
        } as ChatPushListener);
      })
      .catch(e => {
        console.warn('test:zuoyu:init:error:', e);
        ToastAndroid.show(
          'push:init:failed' + JSON.stringify(e),
          ToastAndroid.SHORT,
        );
      });

    ChatClient.getInstance()
      .init(
        new ChatOptions({
          autoLogin: false,
          debugModel: true,
          appKey: appKeyRef.current,
          pushConfig: new ChatPushConfig({
            deviceId: deviceIdRef.current,
            deviceToken: tokenRef.current,
          }),
        }),
      )
      .then(() => {
        console.log('test:zuoyu:init:success');
        ToastAndroid.show('chat:init:success', ToastAndroid.SHORT);
        ChatClient.getInstance().addConnectionListener({
          onConnected: () => {
            console.log('test:zuoyu:onConnected');
          },
          onDisconnected: () => {
            console.log('test:zuoyu:onDisconnected');
          },
        } as ChatConnectEventListener);
      })
      .catch(e => {
        console.warn('test:zuoyu:init:error:', e);
        ToastAndroid.show(
          'chat:init:failed' + JSON.stringify(e),
          ToastAndroid.SHORT,
        );
      });
  }, []);

  const uninit = React.useCallback(() => {
    ChatPushClient.getInstance().clearListener();
  }, []);

  const onGetTokenAsync = async () => {
    console.log('test:zuoyu:click:onGetTokenAsync');
    const ret = await requestPermission();
    if (ret === false) {
      return;
    }
    ChatPushClient.getInstance()
      .getTokenAsync()
      .then(() => {
        console.log('test:zuoyu:click:onGetTokenAsync:success');
        ToastAndroid.show('chat:onGetTokenAsync:success', ToastAndroid.SHORT);
      })
      .catch(e => {
        console.warn('test:zuoyu:click:onGetTokenAsync:error:', e);
        ToastAndroid.show(
          'chat:onGetTokenAsync:failed' + JSON.stringify(e),
          ToastAndroid.SHORT,
        );
      });
  };

  const onRegister = async () => {
    console.log('test:zuoyu:click:onRegister');
    const ret = await requestPermission();
    if (ret === false) {
      return;
    }
    ChatPushClient.getInstance()
      .registerPush()
      .then(() => {
        console.log('test:zuoyu:click:onRegister:success');
        ToastAndroid.show('chat:onRegister:success', ToastAndroid.SHORT);
      })
      .catch(e => {
        console.warn('test:zuoyu:click:onRegister:error:', e);
        ToastAndroid.show(
          'chat:onRegister:failed' + JSON.stringify(e),
          ToastAndroid.SHORT,
        );
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
          console.log('test:zuoyu:requestPermission:success');
          return true;
        } else {
          return false;
        }
      }
    }
    return true;
  };

  const onLoginAction = () => {
    ChatClient.getInstance()
      .login(userId, userToken, true)
      .then(() => {
        console.log('test:zuoyu:login:success');
        ToastAndroid.show('chat:login:success', ToastAndroid.SHORT);
        ChatClient.getInstance().chatManager.addMessageListener({
          onMessagesReceived: (messages: Array<ChatMessage>) => {
            console.log(
              'test:zuoyu:onMessagesReceived:',
              JSON.stringify(messages),
            );
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
        console.warn('test:zuoyu:login:error:', e);
        ToastAndroid.show(
          'chat:login:failed' + JSON.stringify(e),
          ToastAndroid.SHORT,
        );
      });
  };

  const onLogoutAction = () => {
    ChatClient.getInstance()
      .logout(true)
      .then(() => {
        console.log('test:zuoyu:logout:success');
        ToastAndroid.show('chat:logout:success', ToastAndroid.SHORT);
      })
      .catch(e => {
        console.warn('test:zuoyu:logout:error:', e);
        ToastAndroid.show(
          'chat:logout:failed.' + JSON.stringify(e),
          ToastAndroid.SHORT,
        );
      });
  };

  const onSendMessage = () => {
    const msg = ChatMessage.createTextMessage(
      targetId,
      content,
      ChatMessageChatType.PeerChat,
    );
    ChatClient.getInstance().chatManager.sendMessage(msg, {
      onError: e => {
        console.warn('test:zuoyu:onSendMessage:error:', e);
      },
      onSuccess: (newMsg: ChatMessage) => {
        console.log(
          'test:zuoyu:onSendMessage:success:',
          JSON.stringify(newMsg),
        );
        const body = newMsg.body as ChatTextMessageBody;
        setData(prev => {
          return [{id: newMsg.msgId, text: body.content}, ...prev];
        });
        contentInputRef.current?.clear();
      },
    } as ChatMessageStatusCallback);
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

  React.useEffect(() => {
    init();
    return () => {
      uninit();
    };
  }, [init, uninit]);

  return (
    <SafeAreaView style={styles.container}>
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

      <Pressable style={styles.button} onPress={onLoginAction}>
        <Text>{'login action'}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={onGetTokenAsync}>
        <Text>{'get token async'}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={onRegister}>
        <Text>{'register async'}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={onLogoutAction}>
        <Text>{'logout action'}</Text>
      </Pressable>

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

      <Pressable style={styles.button} onPress={onSendMessage}>
        <Text>{'send text message'}</Text>
      </Pressable>

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
    marginVertical: 10,
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
    height: 20,
  },
  id: {
    color: 'black',
  },
  text: {
    color: 'red',
    flex: 1,
  },
});
