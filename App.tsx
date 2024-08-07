/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import * as React from 'react';

import {StyleSheet, View, Text, Pressable, ToastAndroid} from 'react-native';
import {
  multiply,
  ChatPushClient,
  getPlatform,
  getDeviceType,
  type PushType,
  type ChatPushListener,
} from 'react-native-push-collection';

export default function App() {
  const [result, setResult] = React.useState<number | undefined>();

  React.useEffect(() => {
    multiply(3, 7).then(setResult);
  }, []);

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
        ChatPushClient.getInstance().addListener({
          onError: error => {
            console.log('test:zuoyu:onError:', error);
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
          },
        } as ChatPushListener);
      })
      .catch(e => {
        console.warn('test:zuoyu:init:error:', e);
        ToastAndroid.show(
          'init error:' + JSON.stringify(e),
          ToastAndroid.SHORT,
        );
      });
  }, []);

  const uninit = React.useCallback(() => {
    ChatPushClient.getInstance().clearListener();
  }, []);

  const onGetTokenAsync = () => {
    console.log('test:zuoyu:click:onGetTokenAsync');
    ChatPushClient.getInstance()
      .getTokenAsync()
      .then(() => {
        console.log('test:zuoyu:click:onGetTokenAsync:success');
        ToastAndroid.show('get token success', ToastAndroid.SHORT);
      })
      .catch(e => {
        console.log('test:zuoyu:click:onGetTokenAsync:error:', e);
        ToastAndroid.show(
          'get token error:' + JSON.stringify(e),
          ToastAndroid.SHORT,
        );
      });
  };

  React.useEffect(() => {
    init();
    return () => {
      uninit();
    };
  }, [init, uninit]);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
      <Pressable style={styles.button} onPress={onGetTokenAsync}>
        <Text>{'get token async'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 150,
    height: 40,
    marginVertical: 20,
    backgroundColor: 'lightblue',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
