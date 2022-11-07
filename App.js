import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Button,
  FlatList,
  TouchableOpacity,
  Image
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'expo-camera';
import { shareAsync } from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

import { API, graphqlOperation } from 'aws-amplify';
import { createImage } from './src/graphql/mutations';
import { listImages } from './src/graphql/queries';
// import { S3Image } from 'aws-amplify-react-native';

import { Amplify } from 'aws-amplify'
import awsconfig from './src/aws-exports'

Amplify.configure(awsconfig)

//display picture information
const Section = ({ children, title }): Node => {
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: rgba(0,0,0,1),
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: rgba(0,0,0,1),
          },
        ]}>
        {children}
      </Text>
    </View>
  );
};

const App = () => {
  let cameraRef = useRef(); //
  const [images, setImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(); //
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(); //
  const [photo, setPhoto] = useState(); //

  useEffect(() => {
    fetchImages();
  }, [])

  useEffect(() => {
        (async () => {
          const cameraPermission = await Camera.requestCameraPermissionsAsync();
          const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
          setHasCameraPermission(cameraPermission.status === "granted");
          setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
        })();
      }, []);

  function onShowCameraPressed() {
    setShowCamera(true);
  }

  if (hasCameraPermission === undefined) {
        return <Text>Requesting permissions...</Text>
      } else if (!hasCameraPermission) {
        return <Text>Permission for camera not granted. Please change this in settings.</Text>
      }

  takePicture = async () => {
    if (this.camera) {
      const options = { quality: 0.5, base64: true };
      const photo = await this.camera.takePictureAsync(options);

      const response = await fetch(photo.uri);
      const blob = await response.blob();

      const key = photo.uri.split("/").pop();

      Storage.put(key, blob, { level: 'private' })
        .then(result => {
          console.log(result)
          addImage(key);
          setShowCamera(false);
        })
        .catch(err => {
          console.log(err)
        });
    }
  };

  let takePic = async () => {
        let options = {
          quality: 1,
          base64: true,
          exif: false
        };
    
        let newPhoto = await cameraRef.current.takePictureAsync(options);
        setPhoto(newPhoto);
      };

  async function fetchImages() {
    try {
      const imageData = await API.graphql(graphqlOperation(listImages));
      const images = imageData.data.listImages.items;
      setImages(images);
    } catch (err) { console.log('error fetching images') }
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

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <Camera style={styles.container} ref={cameraRef}>
          {/* <View style={styles.buttonContainer}> */}
            {/* <Button title="Take Pic" onPress={takePic} /> */}
            {/* </View> */}
            {/* <StatusBar style="auto" /> */}
        </Camera>

        <View style={{ flex: 0, flexDirection: 'row', justifyContent: 'center' }}>
          <TouchableOpacity onPress={takePic.bind(this)} style={styles.capture}>
            <Text style={{ fontSize: 14 }}> Label Image </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  } else {
    return (
      <SafeAreaView >
        <StatusBar style="auto"/>
        <Button title="Take Picture" onPress={onShowCameraPressed} />
        <FlatList
          data={images}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item, index }) => (
            <View key={item.id ? item.id : index} style={{}} >
              <View style={styles.imageContainer}>
                  <S3Image level="private" imgKey={item.key} style={styles.image}  />
                </View>
              <Section title={item.key}>
                {item.labels.map((label, index) => (
                  <Text key={index}>{label}, </Text>
                ))
                }
              </Section>
            </View>
          )}
        >
        </FlatList>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
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
    // backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capture: {
    flex: 0,
    // backgroundColor: '#fff',
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
  preview: {
        alignSelf: 'stretch',
        flex: 1
      }
});

// export default withAuthenticator(App);
export default App;

// export default function App() {
//   let cameraRef = useRef();
//   const [hasCameraPermission, setHasCameraPermission] = useState();
//   const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState();
//   const [photo, setPhoto] = useState();

//   useEffect(() => {
//     (async () => {
//       const cameraPermission = await Camera.requestCameraPermissionsAsync();
//       const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
//       setHasCameraPermission(cameraPermission.status === "granted");
//       setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
//     })();
//   }, []);

//   // If no Camera permission or not defined.
//   if (hasCameraPermission === undefined) {
//     return <Text>Requesting permissions...</Text>
//   } else if (!hasCameraPermission) {
//     return <Text>Permission for camera not granted. Please change this in settings.</Text>
//   }

//   let takePic = async () => {
//     let options = {
//       quality: 1,
//       base64: true,
//       exif: false
//     };

//     let newPhoto = await cameraRef.current.takePictureAsync(options);
//     setPhoto(newPhoto);
//   };

//   async function fetchImages() {
//     try {
//       const imageData = await API.graphql(graphqlOperation(listImages));
//       const images = imageData.data.listImages.items;
//       setImages(images);
//     } catch (err) { console.log('error fetching images') }
//   }

//   async function addImage(key) {
//     try {
//       const image = { key: key, labels: ['cat', 'animal'] };
//       setImages([...images, image]);
//       await API.graphql(graphqlOperation(createImage, { input: image }));
//     } catch (err) {
//       console.log('error creating image:', err)
//     }
//   }

//   if (photo) {
//     let sharePic = () => {
//       shareAsync(photo.uri).then(() => {
//         setPhoto(undefined);
//       });
//     };

//     let savePhoto = () => {
//       MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
//         setPhoto(undefined);
//       });
//     };

//     return (
//       <SafeAreaView style={styles.container}>
//         <Image style={styles.preview} source={{ uri: "data:image/jpg;base64," + photo.base64 }} />
//         <Button title="Share" onPress={sharePic} />
//         {hasMediaLibraryPermission ? <Button title="Save" onPress={savePhoto} /> : undefined}
//         <Button title="Discard" onPress={() => setPhoto(undefined)} />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <Camera style={styles.container} ref={cameraRef}>
//       <View style={styles.buttonContainer}>
//         <Button title="Take Pic" onPress={takePic} />
//       </View>
//       <StatusBar style="auto" />
//     </Camera>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   buttonContainer: {
//     backgroundColor: '#fff',
//     alignSelf: 'flex-end'
//   },
//   preview: {
//     alignSelf: 'stretch',
//     flex: 1
//   }
// });
