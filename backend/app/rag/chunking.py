from langchain_text_splitters import RecursiveCharacterTextSplitter

AVG_CHARS_PER_TOKEN = 4
DEFAULT_CHUNK_TOKENS = 320
DEFAULT_OVERLAP_TOKENS = 64
SECTION_CHUNK_TOKENS = 420
SECTION_OVERLAP_TOKENS = 84
DAY_CHUNK_TOKENS = 650
DAY_OVERLAP_TOKENS = 50


def tokens_to_chars(token_count: int) -> int:
    return token_count * AVG_CHARS_PER_TOKEN


def detect_structure(text):
    if "•" in text or "-" in text:
        return "bullet"
    elif "Section" in text or "Chapter" in text:
        return "section"
    else:
        return "plain"

def chunk_documents(documents):
    all_chunks = []

    # Stage-1 split for large day/session sections
    day_splitter = RecursiveCharacterTextSplitter(
        chunk_size=tokens_to_chars(DAY_CHUNK_TOKENS),
        chunk_overlap=tokens_to_chars(DAY_OVERLAP_TOKENS),
        separators=["Day-"]
    )

    for doc in documents:
        day_chunks = day_splitter.split_documents([doc])

        for day_chunk in day_chunks:
            text = day_chunk.page_content
            structure = detect_structure(text)

            # Stage-2 split with explicit token/overlap settings
            if structure == "bullet":
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=tokens_to_chars(DEFAULT_CHUNK_TOKENS),
                    chunk_overlap=tokens_to_chars(DEFAULT_OVERLAP_TOKENS),
                    separators=["\n\n", "\n", "•", "-"]
                )
            elif structure == "section":
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=tokens_to_chars(SECTION_CHUNK_TOKENS),
                    chunk_overlap=tokens_to_chars(SECTION_OVERLAP_TOKENS)
                )
            else:
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=tokens_to_chars(DEFAULT_CHUNK_TOKENS),
                    chunk_overlap=tokens_to_chars(DEFAULT_OVERLAP_TOKENS)
                )

            chunks = splitter.split_documents([day_chunk])

            for i, chunk in enumerate(chunks):
                chunk.metadata["chunk_id"] = i
                chunk.metadata["chunk_size_tokens"] = (
                    SECTION_CHUNK_TOKENS if structure == "section" else DEFAULT_CHUNK_TOKENS
                )
                chunk.metadata["chunk_overlap_tokens"] = (
                    SECTION_OVERLAP_TOKENS if structure == "section" else DEFAULT_OVERLAP_TOKENS
                )
                chunk.metadata["token_estimate"] = max(1, len(chunk.page_content) // AVG_CHARS_PER_TOKEN)
                if "Day-" in text:
                    day_label = text.split(":")[0].strip()
                    chunk.metadata["day"] = day_label

            all_chunks.extend(chunks)

    return all_chunks
