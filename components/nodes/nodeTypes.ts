import TextNode from "./TextNode";
import UploadImageNode from "./UploadImageNode";
import UploadVideoNode from "./UploadVideoNode";
import LLMNode from "./LLMNode";
import CropImageNode from "./CropImageNode";
import ExtractFrameNode from "./ExtractFrameNode";

export const nodeTypes = {
  text: TextNode,
  "upload-image": UploadImageNode,
  "upload-video": UploadVideoNode,
  llm: LLMNode,
  "crop-image": CropImageNode,
  "extract-frame": ExtractFrameNode
};
