// import React, { useState } from "react";
// import {
//     View,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     StyleSheet,
//     Image,
//     SafeAreaView,
//     ActivityIndicator,
// } from "react-native";
// import { useRouter } from "expo-router";
// import * as ImagePicker from "expo-image-picker";
// import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

// export default function AddPet() {
//     const router = useRouter();
//     const [petName, setPetName] = useState("");
//     const [breed, setBreed] = useState("");
//     const [gender, setGender] = useState("");
//     const [age, setAge] = useState("");
//     const [color, setColor] = useState("");
//     const [height, setHeight] = useState("");
//     const [weight, setWeight] = useState("");
//     const [image, setImage] = useState<string | null>(null);
//     const [loading, setLoading] = useState(false);

//     const pickImage = async () => {
//         const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
//         if (!permissionResult.granted) {
//             alert("ต้องอนุญาตการเข้าถึงรูปภาพก่อนจึงจะใช้งานได้");
//             return;
//         }

//         const result = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: ImagePicker.MediaTypeOptions.Images,
//             allowsEditing: true,
//             aspect: [4, 3],
//             quality: 1,
//         });

//         if (!result.canceled) {
//             setImage(result.assets[0].uri);
//         }
//     };

//     const handleAddPet = async () => {
//         setLoading(true);
//         try {
//             const formData = new FormData();
//             formData.append("petName", petName);
//             formData.append("breed", breed);
//             formData.append("gender", gender);
//             formData.append("age", age);
//             formData.append("color", color);
//             formData.append("height", height);
//             formData.append("weight", weight);

//             if (image) {
//                 const filename = image.split("/").pop() || "photo.jpg";
//                 const match = /\.(\w+)$/.exec(filename);
//                 const ext = match ? match[1] : "jpg";
//                 const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;

//                 formData.append("image", {
//                     uri: image,
//                     name: filename,
//                     type: mimeType,
//                 } as any);
//             }

//             const res = await fetch("http://10.52.250.197:3000/api/pets", {
//                 method: "POST",
//                 body: formData,
//                 headers: {
//                     Accept: "application/json",
//                 },
//             });

//             const data = await res.json();
//             if (res.ok) {
//                 alert("เพิ่มข้อมูลสัตว์เลี้ยงเรียบร้อย!");
//                 router.back();
//             } else {
//                 alert("ผิดพลาด: " + data.error);
//             }
//         } catch (err: any) {
//             alert("Error: " + err.message);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <>
//             <SafeAreaView style={styles.headerContainer}>
//                 <TouchableOpacity
//                     style={styles.backButton}
//                     onPress={() => router.back()}
//                 >
//                     <Text style={styles.backButtonText}>กลับ</Text>
//                 </TouchableOpacity>
//             </SafeAreaView>

//             <View style={styles.container}>
//                 <Text style={styles.title}>เพิ่มข้อมูลสัตว์เลี้ยง</Text>

//                 <Text style={styles.InputTitle}>ชื่อสัตว์เลี้ยง</Text>
//                 <TextInput
//                     placeholder="Pet Name"
//                     style={styles.input}
//                     value={petName}
//                     onChangeText={setPetName}
//                 />

//                 <Text style={styles.InputTitle}>สายพันธุ์</Text>
//                 <TextInput
//                     placeholder="Breed Name"
//                     style={styles.input}
//                     value={breed}
//                     onChangeText={setBreed}
//                 />

//                 <View style={styles.row}>
//                     <View style={styles.inputGroup}>
//                         <Text style={styles.InputTitle}>เพศ</Text>
//                         <TextInput
//                             placeholder="Gender"
//                             style={styles.inputSmall}
//                             value={gender}
//                             onChangeText={setGender}
//                         />
//                     </View>

//                     <View style={styles.inputGroup}>
//                         <Text style={styles.InputTitle}>อายุ</Text>
//                         <TextInput
//                             placeholder="Age"
//                             style={styles.inputSmall}
//                             value={age}
//                             onChangeText={setAge}
//                         />
//                     </View>

//                     <View style={styles.inputGroup}>
//                         <Text style={styles.InputTitle}>สี</Text>
//                         <TextInput
//                             placeholder="Color"
//                             style={styles.inputSmall}
//                             value={color}
//                             onChangeText={setColor}
//                         />
//                     </View>
//                 </View>

//                 <View style={styles.row}>
//                     <View style={styles.inputGroup}>
//                         <Text style={styles.InputTitle}>ส่วนสูง</Text>
//                         <TextInput
//                             placeholder="Height"
//                             style={styles.inputSmall}
//                             value={height}
//                             onChangeText={setHeight}
//                         />
//                     </View>

//                     <View style={styles.inputGroup}>
//                         <Text style={styles.InputTitle}>น้ำหนัก</Text>
//                         <TextInput
//                             placeholder="Weight"
//                             style={styles.inputSmall}
//                             value={weight}
//                             onChangeText={setWeight}
//                         />
//                     </View>
//                 </View>

//                 <Text style={styles.InputTitle}>เพิ่มรูปภาพ</Text>
//                 <TouchableOpacity
//                     style={[styles.inputSmall, styles.imagePicker]}
//                     onPress={pickImage}
//                 >
//                     {image ? (
//                         <Image
//                             source={{ uri: image }}
//                             style={{ width: 150, height: 150 }}
//                         />
//                     ) : (
//                         <FontAwesome6
//                             name="file-image"
//                             size={80}
//                             color={"lightgray"}
//                         />
//                     )}
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                     style={[styles.button, loading && { opacity: 0.6 }]}
//                     onPress={handleAddPet}
//                     disabled={loading}
//                 >
//                     {loading ? (
//                         <ActivityIndicator color="#fff" />
//                     ) : (
//                         <Text style={styles.buttonText}>เพิ่ม</Text>
//                     )}
//                 </TouchableOpacity>
//             </View>
//         </>
//     );
// }

// const styles = StyleSheet.create({
//     headerContainer: {
//         height: 100
//     },
//     backButton: {
//         paddingHorizontal: 20,
//         alignItems: "flex-start"
//     },
//     backButtonText: {
//         color: "black",
//         fontSize: 18,
//         fontWeight: "bold"
//     },
//     container: {
//         flex: 1,
//         padding: 20,
//         backgroundColor: "#fff"
//     },
//     title: {
//         fontSize: 18,
//         fontWeight: "bold",
//         marginBottom: 15,
//         textAlign: "center",
//     },
//     input: {
//         backgroundColor: "#eee",
//         borderRadius: 15,
//         padding: 12,
//         marginBottom: 12,
//         fontSize: 16,
//     },
//     row: {
//         flexDirection: "row",
//         marginBottom: 12,
//         justifyContent: "space-between",
//     },
//     inputSmall: {
//         backgroundColor: "#eee",
//         borderRadius: 15,
//         padding: 12,
//         fontSize: 16,
//         textAlign: "center",
//     },
//     imagePicker: {
//         justifyContent: "center",
//         alignItems: "center",
//         marginTop: 5,
//         height: 150,
//     },
//     button: {
//         backgroundColor: "#FFC107",
//         borderRadius: 12,
//         paddingVertical: 15,
//         alignItems: "center",
//         marginTop: 15,
//     },
//     buttonText: {
//         color: "#fff",
//         fontWeight: "bold",
//         fontSize: 16
//     },
//     InputTitle: {
//         fontSize: 14,
//         fontWeight: "bold",
//         marginBottom: 10
//     },
//     inputGroup: {
//         flex: 1,
//         marginHorizontal: 5
//     },
// });

import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  SafeAreaView,
  View,
  Pressable,
  TextInput,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from "react-native";
import PetItem from "@/components/petItem";
import AntDesign from "@expo/vector-icons/AntDesign";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function PetPage() {
  const [title, setTitle] = useState<string>("");

  // Add a new document with a generated id.
  const addPetItem = async () => {
    try {
      const docRef = await addDoc(collection(db, "pets"), {
        title: title,
        isChecked: false
      });
      console.log("Document written with ID: ", docRef.id);
      setTitle("");
    } catch (e) {
      console.error("Error adding document: ", e)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* heading */}
        <Text style={styles.heading}>Pet List</Text>
        {/* no of shopping items */}
        <Text style={styles.noOfItem}>0</Text>
        {/* delete all */}
        <Pressable onPress={() => console.log("Delete all pressed")}>
          <AntDesign name="delete" size={30} color="black" />
        </Pressable>
      </View>

      {/* ตัวอย่าง list */}
      <PetItem />
      <PetItem />
      <PetItem />

      {/* input */}
      <TextInput
        placeholder="Enter Pet Item"
        style={styles.input}
        value={title}
        onChangeText={(text: string) => setTitle(text)}
        onSubmitEditing={addPetItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    width: "90%",
    alignSelf: "center",
    padding: 10,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  heading: {
    fontSize: 30,
    fontWeight: "500",
    flex: 1,
  },
  noOfItem: {
    fontSize: 30,
    fontWeight: "500",
    marginRight: 20,
  },
  input: {
    width: "90%",
    alignSelf: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 10,
  },
});