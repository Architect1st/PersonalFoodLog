import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, Button, Image, FlatList, TouchableOpacity } from 'react-native';

import { useEffect, useRef, useState } from 'react';
import { Camera } from 'expo-camera';
import { shareAsync } from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

import { API, graphqlOperation, photoPlaceholder, Storage} from 'aws-amplify';
import { createImage } from './src/graphql/mutations';
import { listImages } from './src/graphql/queries';

import { S3Image } from 'aws-amplify-react-native';

import { Amplify } from 'aws-amplify'
import awsconfig from './src/aws-exports'

Amplify.configure(awsconfig)

import {
  Predictions,
  AmazonAIPredictionsProvider
} from '@aws-amplify/predictions';

Amplify.configure(awsconfig);
Amplify.addPluggable(new AmazonAIPredictionsProvider());

import * as ImageManipulator from 'expo-image-manipulator';

//display picture information
const Section = ({ children, title }): Node => {
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[styles.sectionTitle]}>
        {title}
      </Text>
      <Text
        style={[styles.sectionDescription]}>
        {children}
      </Text>
    </View>
  );
};

export default function App() {
  let cameraRef = useRef();
  const [hasCameraPermission, setHasCameraPermission] = useState();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState();
  const [photo, setPhoto] = useState();

  const [images, setImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false) // to control camera preview

  // Display on Home Screen
  useEffect(() => {
    fetchImages();
  }, [])

  function onShowCameraPressed() {
    setShowCamera(true);
  }

  async function fetchImages() {
    try {
      const imageData = await API.graphql(graphqlOperation(listImages));
      const images = imageData.data.listImages.items;
      setImages(images); //put images into setImages[]
    } catch (err) { console.log('error fetching images'); console.log(err) }
  }
  
  async function addImage(key) {
    try {
      const image = { key: key, labels: ['cat', 'animal'] };
      setImages([...images, image]);
      await API.graphql(graphqlOperation(createImage, { input: image }));
    } catch (err) {
      console.log('error creating image:', err)
    }
  }

  /////////////
  // Camera Permission
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
    })();
  }, []);
  if (hasCameraPermission === undefined) {
    return <Text>Requesting permissions...</Text>
  } else if (!hasCameraPermission) {
    return <Text>Permission for camera not granted. Please change this in settings.</Text>
  }

  // Take Picture function
  let takePic = async () => {
    let options = {
      quality: 0.5, // can be set to 1
      base64: true,
      exif: false
    };

    let newPhoto = await cameraRef.current.takePictureAsync(options);
    // newPhoto = await ImageManipulator.manipulateAsync(newPhoto.uri, [{resize: {width: 2000, height: 2000}}]);
    setPhoto(newPhoto);
    const response = await fetch(newPhoto.uri);
    const blob = await response.blob();
    const key = newPhoto.uri.split("/").pop();

    // Storage.put(key, blob, { level: 'public', contentType: 'image/jpg' })
    //     .then(result => {
    //       Predictions.identify({
    //         labels: {
    //           source: {
    //             key: key,
    //             level: 'public'
    //           },
    //           type: "ALL"
    //         }
    //       }).then(result => {
    //         const { labels } = result;
    //         const labelNames = labels.map(l => l.name);
            
    //         addImage(key, labelNames);
    //         setShowCamera(false);
    //       }).catch(err => {
    //         console.log('error: ', err);
    //       });
    //     })
    //     .catch(err => {
    //       console.log(err);
    //     });

    Storage.put(key, blob, { level: 'public', contentType: 'image/jpg' })
      .then(result => {
        console.log(result)
        addImage(key);
        setShowCamera(false);
      })
      .catch(err => {
        console.log(err)
      });
};
  
  //display photo after photo is taken
  if (photo) {
    let sharePic = () => {
      // storeImage(photo);
      shareAsync(photo.uri).then(() => {
        setPhoto(undefined);
      });
    };

    let savePhoto = () => {
      // storeImage(photo);
      MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
        setPhoto(undefined);
      });
    };

    return ( // show image preview and show buttons
      <SafeAreaView style={styles.ImagePreviewContainer}>
        <Image style={styles.ImagePreview} source={{ uri: "data:image/jpg;base64," + photo.base64 }} />
        <Button title="Share" onPress={sharePic} />
        {hasMediaLibraryPermission ? <Button title="Save & Upload" onPress={savePhoto} /> : undefined}
        <Button title="Discard" onPress={() => setPhoto(undefined)} />
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return ( // if in camera view
      <View style={styles.cameraContainer}>
        <StatusBar style="auto" />
        <Camera style={styles.preview} ref={cameraRef}></Camera>
        <View style={{ flex: 0, flexDirection: 'row', justifyContent: 'center' }}>
          <TouchableOpacity onPress={takePic} style={styles.capture}>
            <Text style={{ fontSize: 14 }}> Scan Food </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  } else { 
    return ( // default screen
    <SafeAreaView>
    <StatusBar style="auto" />
    <Button title="Take Picture" onPress={onShowCameraPressed} />
    <FlatList 
      data={images}
      contentInsetAdjustmentBehavior="automatic"
      // style={backgroundStyle}
      renderItem={({ item, index }) => (
        <View key={item.id ? item.id : index}>
          <View style={styles.imageContainer}>
              <S3Image level="public" imgKey={item.key} style={styles.image}  />
            </View>
          <Section title={item.key}>
            {item.labels.map((label, index) => (
              <Text key={index}>{label}, </Text>
            ))
            }
          </Section>
        </View>
      )}></FlatList>
    </SafeAreaView>
    );
}
};

const styles = StyleSheet.create({
  //Style for Photo information Section
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },

  cameraContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
  imageContainer: {
    height: 195,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
    resizeMode: 'cover',
  },

  // camera
  ImagePreviewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // buttonContainer: {
  //   backgroundColor: '#fff',
  //   alignSelf: 'flex-end'
  // },
  ImagePreview: {
    alignSelf: 'stretch',
    flex: 1
  }
});

